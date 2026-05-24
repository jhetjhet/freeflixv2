'use strict';

/**
 * Stream control plane.
 *
 * Resolves a movie ID to a magnet URI, performs lightweight validation and
 * capacity checks via Redis, then returns a streamUrl that points to the
 * dedicated torrent-worker data-plane service.
 *
 * The actual WebTorrent download and HTTP byte-range streaming live in
 * torrent-worker/routes/stream.js — this file intentionally has no
 * WebTorrent dependency.
 */

const { Router } = require('express');
const { redis } = require('../redis-client');
const { generateMovieMagnet } = require('../services/p2p-api');

const router = Router();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAX_MAGNET_LENGTH   = 2048;
const MAX_ACTIVE_TORRENTS = parseInt(process.env.MAX_ACTIVE_TORRENTS    || '5', 10);
const MAX_TORRENT_SIZE    = parseInt(process.env.MAX_TORRENT_SIZE_BYTES || String(5 * 1024 ** 3), 10); // 5 GB

// Base URL of the torrent-worker as seen by the *client* (browser / mobile).
// nginx exposes the worker at /torrent/ so an empty TORRENT_WORKER_PUBLIC_URL
// (or a value of '/') means clients reach it via the same origin.
// Override in production if the worker is on a separate domain.
const TORRENT_WORKER_BASE = (process.env.TORRENT_WORKER_PUBLIC_URL || '').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Redis keys
// ---------------------------------------------------------------------------
const statsKey          = (infoHash) => `torrent:stats:${infoHash}`;
const streamMemStatsKey = 'stream:memstats';
const activeTorrentsKey = 'torrent:active';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encode a magnet URI to a URL-safe base64 string for use as a query param.
 */
function encodeMagnet(magnetUri) {
    return Buffer.from(magnetUri, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Extract the provisional infoHash from a magnet URI (lowercase).
 * Supports both hex-40 and base32-32 formats.
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
 * Returns null if absent or unparseable.
 */
function extractMagnetSize(magnetUri) {
    const m = magnetUri.match(/[?&]xl=(\d+)/);
    return m ? parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Graceful shutdown — no-op here; WebTorrent lifecycle is owned by the worker.
// Kept so index.js can call shutdown() without branching.
// ---------------------------------------------------------------------------
async function shutdown() { /* no-op */ }

// ---------------------------------------------------------------------------
// Capacity endpoint — reads from shared Redis so the answer includes any
// torrents already active in the worker.
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
// Stats endpoint — proxies Redis data written by the torrent worker.
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
        res.json({ activeCount: activeHashes.length, torrents, memstats });
    } catch (err) {
        console.error('[stream] stats error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve stats' });
    }
});

// ---------------------------------------------------------------------------
// Route handler: GET /:movie_id
//
// Resolves movie_id → magnet URI, validates it, checks capacity, then returns
// a JSON response with a streamUrl the client should use to begin playback.
// The streamUrl points to the torrent-worker data-plane service and carries
// the base64url-encoded magnet as a query parameter.
// ---------------------------------------------------------------------------
router.get('/:movie_id', async (req, res) => {
    const { movie_id } = req.params;

    // 1. Resolve movie ID → magnet URI
    let magnetUri;
    try {
        magnetUri = await generateMovieMagnet(movie_id);
    } catch (err) {
        console.error(`[stream] generateMovieMagnet error for ${movie_id}:`, err.message);
        return res.status(502).json({ error: 'Failed to resolve movie magnet URI' });
    }

    if (!magnetUri) {
        return res.status(404).json({ error: 'Movie not found or no magnet URI available' });
    }

    // 2. Validate magnet
    const validationError = validateMagnet(magnetUri);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    // 3. Fast-reject on declared size before any download starts (xl= param)
    const declaredSize = extractMagnetSize(magnetUri);
    if (declaredSize !== null && declaredSize > MAX_TORRENT_SIZE) {
        return res.status(413).json({ error: `Torrent too large: declared ${declaredSize} bytes, max ${MAX_TORRENT_SIZE}` });
    }

    // 4. Extract provisional infoHash
    const infoHash = extractInfoHash(magnetUri);
    if (!infoHash) {
        return res.status(400).json({ error: 'Could not extract infoHash from magnet URI' });
    }

    // 5. Capacity check via Redis (shared with worker)
    try {
        const active = await redis.scard(activeTorrentsKey);
        const alreadyActive = await redis.sismember(activeTorrentsKey, infoHash);
        if (!alreadyActive && active >= MAX_ACTIVE_TORRENTS) {
            return res.status(503).json({
                error: `Active torrent limit reached (${MAX_ACTIVE_TORRENTS}). Try again later.`,
                active,
                max: MAX_ACTIVE_TORRENTS,
            });
        }
    } catch (err) {
        console.error('[stream] Redis capacity check failed:', err.message);
        // Non-fatal: let the worker enforce its own limit
    }

    // 6. Build stream URL for the torrent worker
    const encodedMagnet = encodeMagnet(magnetUri);
    const streamUrl = `${TORRENT_WORKER_BASE}/torrent/stream/${infoHash}?magnet=${encodedMagnet}`;

    return res.json({ streamUrl, infoHash });
});

module.exports = { router, shutdown };
