'use strict';

/**
 * torrent-worker data-plane streaming route.
 *
 * Route: GET /stream/:infoHash
 *   Path param  infoHash — provisional hex/base32 infoHash extracted from the magnet URI
 *   Query param magnet   — base64url-encoded magnet URI
 *   Query param start    — optional byte range start (used by HLS-like clients)
 *   Query param end      — optional byte range end
 *
 * Note: WebTorrent v2 is ESM-only; loaded via dynamic import().
 */

const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const { Throttle } = require('stream-throttle');
const { redis } = require('../redis-client');

const router = Router();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DOWNLOAD_DIR = process.env.TORRENT_DOWNLOAD_DIR || '/tmp/webtorrent';
const META_CACHE_TTL     = parseInt(process.env.TORRENT_META_TTL        || '3600',            10); // seconds
const META_WAIT_TIMEOUT  = 30_000;                                                                  // ms
const IDLE_CLEANUP_DELAY = 5 * 60 * 1000;                                                          // ms
const MAX_TORRENT_SIZE   = parseInt(process.env.MAX_TORRENT_SIZE_BYTES  || String(5 * 1024 ** 3), 10); // 5 GB
const MAX_TORRENT_FILES  = parseInt(process.env.MAX_TORRENT_FILES       || '100',             10);
const PRE_BUFFER_BYTES   = parseInt(process.env.PRE_BUFFER_BYTES        || String(2 * 1024 * 1024), 10); // 2 MB
const PRE_BUFFER_TIMEOUT = 15_000;                                                                  // ms
const STATS_INTERVAL_MS  = 10_000;                                                                  // ms
const MAX_MAGNET_LENGTH  = 2048;
const MAX_ACTIVE_TORRENTS    = parseInt(process.env.MAX_ACTIVE_TORRENTS     || '5',             10);
const STREAM_THROTTLE_RATE   = parseInt(process.env.STREAM_THROTTLE_BYTES   || String(1 * 1024 * 1024), 10); // 1 MB/s
const UPLOAD_LIMIT_RATE      = parseInt(process.env.UPLOAD_LIMIT_BYTES      || String(512 * 1024),       10); // 512 KB/s — hard cap on seeding
const RELEASE_COOLDOWN_MS    = 1000;  // ms — delay before decrementing refCount on stream close
const STREAM_CLOSE_SETTLE_MS = 200;   // ms — TCP settle delay before destroying the read stream

// ---------------------------------------------------------------------------
// Redis keys & setup
// ---------------------------------------------------------------------------
const metaCacheKey      = (infoHash) => `torrent:meta:${infoHash}`;
const statsKey          = (infoHash) => `torrent:stats:${infoHash}`;
const streamMemStatsKey = 'stream:memstats';
const activeTorrentsKey = 'torrent:active';

// Ensure download directory exists
try { fs.mkdirSync(DOWNLOAD_DIR, { recursive: true }); } catch (_) { /* ignore */ }

// Flush stale active-torrent tracking left over from a previous process.
redis.del(activeTorrentsKey).catch(() => {});

// ---------------------------------------------------------------------------
// WebTorrent singleton (lazy ESM load)
// ---------------------------------------------------------------------------
let _clientPromise = null;

function getClient() {
    if (!_clientPromise) {
        _clientPromise = import('webtorrent').then(({ default: WebTorrent }) => {
            const client = new WebTorrent({ maxConns: 30, uploadLimit: UPLOAD_LIMIT_RATE });
            client.on('error', (err) => {
                console.error('[stream] webtorrent client error:', err.message);
            });
            return client;
        });
    }
    return _clientPromise;
}

// ---------------------------------------------------------------------------
// In-memory torrent registry
// Map<canonicalHash, { torrent, refCount, idleTimer, pending, streamStartedAt }>
// ---------------------------------------------------------------------------
const registry = new Map();

function acquireTorrent(canonicalHash) {
    const entry = registry.get(canonicalHash);
    if (!entry || !entry.torrent) return null;
    clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
    entry.refCount += 1;
    entry.streamStartedAt = Date.now();
    // Resume peer activity if the torrent was paused between streams.
    if (entry.torrent.paused) entry.torrent.resume();
    return entry.torrent;
}

function releaseTorrent(canonicalHash) {
    const entry = registry.get(canonicalHash);
    if (!entry) return;

    if (entry.streamStartedAt) {
        const duration = Date.now() - entry.streamStartedAt;
        console.log(`[stream] stream ended ${canonicalHash} duration=${duration}ms`);
        pushStreamDuration(canonicalHash, duration).catch(() => {});
        entry.streamStartedAt = null;
    }

    setTimeout(() => {
        const e = registry.get(canonicalHash);
        if (!e) return;
        e.refCount = Math.max(0, e.refCount - 1);
        if (e.refCount === 0 && !e.idleTimer) {
            // Pause immediately so WebTorrent stops exchanging data with peers.
            // Without this, losing the HTTP read-stream backpressure causes a
            // download/upload burst that flatlines the host network for seconds.
            if (e.torrent) e.torrent.pause();
            e.idleTimer = setTimeout(async () => {
                const current = registry.get(canonicalHash);
                if (current && current.refCount === 0) {
                    console.log(`[stream] removing idle torrent ${canonicalHash}`);
                    const client = await getClient();
                    client.remove(canonicalHash, { destroyStore: true }, () => {});
                    registry.delete(canonicalHash);
                    stopStatsIntervalIfEmpty();
                    redis.srem(activeTorrentsKey, canonicalHash).catch(() => {});
                }
            }, IDLE_CLEANUP_DELAY);
        }
    }, RELEASE_COOLDOWN_MS);
}

/**
 * Ensure a torrent is loaded and its metadata resolved.
 *
 * Uses a provisional registry key (the raw extracted hash) while loading,
 * then re-keys to torrent.infoHash (canonical lowercase hex-40) once
 * WebTorrent resolves metadata. This fixes the base32 → hex duplication bug.
 */
async function ensureTorrent(magnetUri, provisionalHash) {
    const client = await getClient();
    const entry = registry.get(provisionalHash);

    // Case 1: Already fully loaded
    if (entry && entry.torrent) {
        return entry.torrent;
    }

    // Case 2: Currently loading — queue behind the first waiter
    if (entry && !entry.torrent) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                const e = registry.get(provisionalHash);
                if (e) e.pending = e.pending.filter((p) => p.timer !== timer);
                reject(new Error('metadata timeout'));
            }, META_WAIT_TIMEOUT);
            entry.pending.push({ resolve, reject, timer });
        });
    }

    // Case 3: Not yet seen — register as loading, then call client.add()
    return new Promise((resolve, reject) => {
        const pending = [];
        registry.set(provisionalHash, { torrent: null, refCount: 0, idleTimer: null, pending, streamStartedAt: null });

        redis.sadd(activeTorrentsKey, provisionalHash).catch(() => {});
        redis.hset(statsKey(provisionalHash),
            'status',    'loading',
            'startedAt', Date.now(),
        ).catch(() => {});
        redis.expire(statsKey(provisionalHash), META_WAIT_TIMEOUT / 1000 + 10).catch(() => {});

        const globalTimer = setTimeout(() => {
            const e = registry.get(provisionalHash);
            if (e && !e.torrent) {
                registry.delete(provisionalHash);
                pending.forEach((p) => { clearTimeout(p.timer); p.reject(new Error('metadata timeout')); });
            }
            redis.srem(activeTorrentsKey, provisionalHash).catch(() => {});
            redis.del(statsKey(provisionalHash)).catch(() => {});
            reject(new Error('metadata timeout'));
        }, META_WAIT_TIMEOUT);

        const torrent = client.add(magnetUri, { path: DOWNLOAD_DIR }, (t) => {
            clearTimeout(globalTimer);

            const canonicalHash = t.infoHash;
            const provisional = registry.get(provisionalHash);
            if (provisional) {
                provisional.torrent = t;
                if (canonicalHash !== provisionalHash) {
                    registry.delete(provisionalHash);
                    redis.srem(activeTorrentsKey, provisionalHash).catch(() => {});
                    redis.del(statsKey(provisionalHash)).catch(() => {});
                    redis.sadd(activeTorrentsKey, canonicalHash).catch(() => {});
                }
                registry.set(canonicalHash, provisional);
                provisional.pending.forEach((p) => { clearTimeout(p.timer); p.resolve(t); });
                provisional.pending = [];
            } else {
                registry.set(canonicalHash, { torrent: t, refCount: 0, idleTimer: null, pending: [], streamStartedAt: null });
                redis.sadd(activeTorrentsKey, canonicalHash).catch(() => {});
            }

            cacheMeta(t);
            pushTorrentStats(t);
            startStatsInterval();
            resolve(t);
        });

        torrent.on('error', (err) => {
            clearTimeout(globalTimer);
            registry.delete(provisionalHash);
            pending.forEach((p) => { clearTimeout(p.timer); p.reject(err); });
            redis.srem(activeTorrentsKey, provisionalHash).catch(() => {});
            redis.del(statsKey(provisionalHash)).catch(() => {});
            reject(err);
        });
    });
}

// ---------------------------------------------------------------------------
// Pre-buffer
// ---------------------------------------------------------------------------
function waitForBuffer(torrent, bytes, timeoutMs) {
    return new Promise((resolve) => {
        if (torrent.downloaded >= bytes) return resolve();
        const timer = setTimeout(resolve, timeoutMs);
        const onDownload = () => {
            if (torrent.downloaded >= bytes) {
                clearTimeout(timer);
                torrent.removeListener('download', onDownload);
                resolve();
            }
        };
        torrent.on('download', onDownload);
    });
}

async function cacheMeta(torrent) {
    try {
        const meta = {
            infoHash: torrent.infoHash,
            name: torrent.name,
            files: torrent.files.map((f, i) => ({ index: i, name: f.name, length: f.length, path: f.path })),
        };
        await redis.set(metaCacheKey(torrent.infoHash), JSON.stringify(meta), 'EX', META_CACHE_TTL);
    } catch (_) { /* non-fatal */ }
}

async function pushTorrentStats(torrent) {
    try {
        const entry = registry.get(torrent.infoHash);
        await redis.hset(statsKey(torrent.infoHash),
            'status',        'ready',
            'name',          torrent.name || '',
            'peers',         torrent.numPeers,
            'downloadSpeed', torrent.downloadSpeed,
            'uploadSpeed',   torrent.uploadSpeed,
            'downloaded',    torrent.downloaded,
            'activeStreams',  entry ? entry.refCount : 0,
            'updatedAt',     Date.now(),
        );
        await redis.expire(statsKey(torrent.infoHash), META_CACHE_TTL);
    } catch (_) { /* non-fatal */ }
}

async function pushStreamDuration(infoHash, durationMs) {
    try {
        await redis.hset(statsKey(infoHash), 'lastStreamDurationMs', durationMs);
    } catch (_) { /* non-fatal */ }
}

async function pushMemStats() {
    try {
        const m = process.memoryUsage();
        await redis.hset(streamMemStatsKey,
            'heapUsed',  m.heapUsed,
            'heapTotal', m.heapTotal,
            'rss',       m.rss,
            'external',  m.external,
            'updatedAt', Date.now(),
        );
        await redis.expire(streamMemStatsKey, 60);
    } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Stats interval
// ---------------------------------------------------------------------------
let _statsInterval = null;

function startStatsInterval() {
    if (_statsInterval) return;
    _statsInterval = setInterval(() => {
        pushMemStats();
        registry.forEach((entry) => {
            if (entry.torrent) pushTorrentStats(entry.torrent);
        });
    }, STATS_INTERVAL_MS);
}

function stopStatsIntervalIfEmpty() {
    if (registry.size === 0 && _statsInterval) {
        clearInterval(_statsInterval);
        _statsInterval = null;
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.ogv', '.m4v', '.ts']);

/**
 * Decode a base64url string back to the original magnet URI.
 */
function decodeMagnet(b64) {
    const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    try {
        return Buffer.from(padded + pad, 'base64').toString('utf8');
    } catch (_) {
        return null;
    }
}

/**
 * Extract the provisional infoHash from a magnet URI (lowercase).
 */
function extractInfoHash(magnetUri) {
    const m = magnetUri.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
    if (!m) return null;
    return m[1].toLowerCase();
}

/**
 * Validate a decoded magnet URI.
 * Returns null if valid, or an error string describing the problem.
 */
function validateMagnet(magnetUri) {
    if (!magnetUri || magnetUri.length > MAX_MAGNET_LENGTH) return 'Magnet URI too long or missing';
    if (!/^magnet:\?/.test(magnetUri)) return 'Not a magnet URI';
    if (!/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i.test(magnetUri)) {
        return 'Missing or malformed xt=urn:btih parameter';
    }
    const dnMatch = magnetUri.match(/[?&]dn=([^&]*)/);
    if (dnMatch) {
        const dn = decodeURIComponent(dnMatch[1]);
        if (/^(javascript:|data:|vbscript:)/i.test(dn.trim())) return 'Suspicious dn parameter';
    }
    return null;
}

/**
 * Extract declared torrent size from the xl= parameter in a magnet URI.
 */
function extractMagnetSize(magnetUri) {
    const m = magnetUri.match(/[?&]xl=(\d+)/);
    return m ? parseInt(m[1], 10) : null;
}

/**
 * Pick the best MIME type based on file extension.
 */
function mimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
        '.mp4':  'video/mp4',
        '.mkv':  'video/x-matroska',
        '.webm': 'video/webm',
        '.avi':  'video/x-msvideo',
        '.mov':  'video/quicktime',
        '.flv':  'video/x-flv',
        '.ogv':  'video/ogg',
        '.m4v':  'video/mp4',
        '.ts':   'video/mp2t',
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Select the largest video file from a torrent.
 */
function pickVideoFile(files) {
    const videoFiles = files.filter((f) => ALLOWED_VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase()));
    const pool = videoFiles.length > 0 ? videoFiles : files;
    return pool.reduce((best, f) => (f.length > best.length ? f : best), pool[0]);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown() {
    console.log('[stream] shutting down, destroying WebTorrent client...');
    if (_statsInterval) { clearInterval(_statsInterval); _statsInterval = null; }
    if (!_clientPromise) return;
    try {
        const client = await _clientPromise;
        await new Promise((resolve) => client.destroy(resolve));
        console.log('[stream] WebTorrent client destroyed');
    } catch (err) {
        console.error('[stream] error during shutdown:', err.message);
    }
}

// ---------------------------------------------------------------------------
// Capacity endpoint
// ---------------------------------------------------------------------------
router.get('/capacity', async (req, res) => {
    try {
        const active = await redis.scard(activeTorrentsKey);
        const ok = active < MAX_ACTIVE_TORRENTS;
        res.json({ ok, active, max: MAX_ACTIVE_TORRENTS });
    } catch (err) {
        console.error('[stream] capacity error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve capacity' });
    }
});

// ---------------------------------------------------------------------------
// Stats endpoint
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
    try {
        const activeHashes = await redis.smembers(activeTorrentsKey);
        const torrents = await Promise.all(
            activeHashes.map(async (hash) => {
                const stats = await redis.hgetall(statsKey(hash));
                return { infoHash: hash, ...stats };
            })
        );
        const memstats = await redis.hgetall(streamMemStatsKey);
        res.json({ inProcessCount: registry.size, activeCount: activeHashes.length, torrents, memstats });
    } catch (err) {
        console.error('[stream] stats error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve stats' });
    }
});

// ---------------------------------------------------------------------------
// Route handler: GET /stream/:infoHash
//
// The control plane (node_backend) resolves movie_id → magnet URI, encodes
// the magnet as base64url, and redirects (or returns) a URL of the form:
//   /torrent/stream/<infoHash>?magnet=<base64url>
//
// This worker decodes the magnet and starts/reuses the WebTorrent download.
// ---------------------------------------------------------------------------
router.get('/:infoHash', async (req, res) => {
    const { infoHash } = req.params;
    const { magnet: magnetB64 } = req.query;

    if (!magnetB64) {
        return res.status(400).json({ error: 'Missing magnet query parameter' });
    }

    const magnetUri = decodeMagnet(magnetB64);
    if (!magnetUri) {
        return res.status(400).json({ error: 'Could not decode magnet query parameter' });
    }

    const validationError = validateMagnet(magnetUri);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    // Fast-reject on declared size before any download starts
    const declaredSize = extractMagnetSize(magnetUri);
    if (declaredSize !== null && declaredSize > MAX_TORRENT_SIZE) {
        return res.status(413).json({ error: `Torrent too large: declared ${declaredSize} bytes, max ${MAX_TORRENT_SIZE}` });
    }

    const provisionalHash = extractInfoHash(magnetUri) || infoHash.toLowerCase();

    // Enforce active torrent limit (skip if already in registry)
    if (!registry.has(provisionalHash) && registry.size >= MAX_ACTIVE_TORRENTS) {
        return res.status(503).json({
            error: `Active torrent limit reached (${MAX_ACTIVE_TORRENTS}). Try again later.`,
            active: registry.size,
            max: MAX_ACTIVE_TORRENTS,
        });
    }

    // Load torrent (reuse if already in memory)
    let torrent;
    try {
        torrent = await ensureTorrent(magnetUri, provisionalHash);
    } catch (err) {
        if (err.message === 'metadata timeout') {
            return res.status(503).json({ error: 'Timed out waiting for torrent metadata' });
        }
        console.error('[stream] torrent error:', err.message);
        return res.status(500).json({ error: 'Failed to load torrent' });
    }

    const canonicalHash = torrent.infoHash;

    // Post-metadata size & file count guards
    if (torrent.length > MAX_TORRENT_SIZE) {
        const client = await getClient();
        client.remove(canonicalHash, { destroyStore: true }, () => {});
        registry.delete(canonicalHash);
        redis.srem(activeTorrentsKey, canonicalHash).catch(() => {});
        return res.status(413).json({ error: `Torrent too large: ${torrent.length} bytes, max ${MAX_TORRENT_SIZE}` });
    }
    if (torrent.files.length > MAX_TORRENT_FILES) {
        return res.status(400).json({ error: `Too many files in torrent: ${torrent.files.length}, max ${MAX_TORRENT_FILES}` });
    }

    if (!torrent.files || torrent.files.length === 0) {
        return res.status(404).json({ error: 'No files found in torrent' });
    }
    const file = pickVideoFile(torrent.files);
    if (!ALLOWED_VIDEO_EXTENSIONS.has(path.extname(file.name).toLowerCase())) {
        return res.status(415).json({ error: `No supported video file found in torrent (got: ${path.extname(file.name)})` });
    }

    // Wait for initial buffer
    await waitForBuffer(torrent, PRE_BUFFER_BYTES, PRE_BUFFER_TIMEOUT);

    // Parse Range header
    const totalSize = file.length;
    const rangeHeader = req.headers['range'];

    let start = 0;
    let end = totalSize - 1;
    let isPartial = false;

    if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (!match) {
            res.set('Content-Range', `bytes */${totalSize}`);
            return res.status(416).json({ error: 'Invalid Range header' });
        }
        start = parseInt(match[1], 10);
        end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize || start > end) {
            res.set('Content-Range', `bytes */${totalSize}`);
            return res.status(416).json({ error: 'Range Not Satisfiable' });
        }
        isPartial = true;
    }

    const chunkSize = end - start + 1;
    const mime = mimeType(file.name);

    res.set({
        'Content-Type':   mime,
        'Content-Length': chunkSize,
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'private',
    });

    if (isPartial) {
        res.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.status(206);
    } else {
        res.status(200);
    }

    acquireTorrent(canonicalHash);

    const stream = file.createReadStream({ start, end });
    const throttle = new Throttle({ rate: STREAM_THROTTLE_RATE });

    stream.on('error', (err) => {
        console.error('[stream] read stream error:', err.message);
        releaseTorrent(canonicalHash);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
        } else {
            res.destroy();
        }
    });

    res.on('close', () => {
        if (!stream.destroyed) {
            // Give TCP a moment to settle before releasing OS buffers.
            setTimeout(() => { stream.destroy(); }, STREAM_CLOSE_SETTLE_MS);
        }
        releaseTorrent(canonicalHash);
    });

    stream.pipe(throttle).pipe(res);
});

module.exports = { router, shutdown };
