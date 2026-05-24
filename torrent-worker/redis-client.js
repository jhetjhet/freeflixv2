'use strict';

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
});

redis.on('connect', () => {
    console.log('[torrent-worker] Redis connected');
});

redis.on('error', (error) => {
    console.error('[torrent-worker] Redis error:', error.message);
});

module.exports = { redis };
