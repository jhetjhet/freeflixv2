const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const redis = new Redis(REDIS_URL, {
	maxRetriesPerRequest: null,
	enableReadyCheck: true,
});

redis.on('connect', () => {
	console.log('[watch-together] Redis connected');
});

redis.on('error', (error) => {
	console.error('[watch-together] Redis error:', error.message);
});

const roomKey = (roomId) => `wt:room:${roomId}`;
const roomUserSetKey = (roomId) => `wt:room:${roomId}:users`;
const roomUserMetaKey = (roomId, userId) => `wt:room:${roomId}:user:${userId}`;

module.exports = {
	redis,
	roomKey,
	roomUserSetKey,
	roomUserMetaKey,
};
