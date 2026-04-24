const { redis, roomKey, roomUserSetKey, roomUserMetaKey } = require('../redis-client');

const ROOM_TTL_SECONDS = 60 * 60 * 24; // 24 hours

// -------------------- ROOM --------------------

const getRoom = async (roomId) => {
    const key = roomKey(roomId);
    const roomData = await redis.get(key);

    if (!roomData) return null;

    try {
        return JSON.parse(roomData);
    } catch (err) {
        await redis.del(key);
        return null;
    }
};

const saveRoom = async (room) => {
    const key = roomKey(room.roomId);
    await redis.set(key, JSON.stringify(room), 'EX', ROOM_TTL_SECONDS);
};

const deleteRoom = async (roomId) => {
    const userIds = await redis.smembers(roomUserSetKey(roomId));

    const pipeline = redis.pipeline();

    pipeline.del(roomKey(roomId));
    pipeline.del(roomUserSetKey(roomId));

    // delete all user metadata
    for (const userId of userIds) {
        pipeline.del(roomUserMetaKey(roomId, userId));
    }

    await pipeline.exec();
};

// -------------------- USERS --------------------

const addUserToRoom = async (roomId, userId, metadata = {}) => {
    const setKey = roomUserSetKey(roomId);
    const metaKey = roomUserMetaKey(roomId, userId);

    const pipeline = redis.pipeline();

    pipeline.sadd(setKey, userId);
    pipeline.hset(metaKey, metadata);

    // sync TTLs
    pipeline.expire(setKey, ROOM_TTL_SECONDS);
    pipeline.expire(metaKey, ROOM_TTL_SECONDS);

    await pipeline.exec();
};

const removeUserFromRoom = async (roomId, userId) => {
    const setKey = roomUserSetKey(roomId);
    const metaKey = roomUserMetaKey(roomId, userId);

    const pipeline = redis.pipeline();

    pipeline.srem(setKey, userId);
    pipeline.del(metaKey);

    const results = await pipeline.exec();

    // check if room is empty AFTER removal
    const size = await redis.scard(setKey);

    if (size === 0) {
        await redis.del(setKey);
        await redis.del(roomKey(roomId));
    }
};

const getUsersInRoom = async (roomId) => {
    const userIds = await redis.smembers(roomUserSetKey(roomId));
    return userIds || [];
};

const getUsersWithMetadata = async (roomId) => {
    const userIds = await getUsersInRoom(roomId);
    if (!userIds.length) return [];

    const pipeline = redis.pipeline();

    userIds.forEach((userId) => {
        pipeline.hgetall(roomUserMetaKey(roomId, userId));
    });

    const results = await pipeline.exec();

    return userIds.map((userId, i) => ({
        userId,
        ...(results[i][1] || {}),
    }));
};

const updateUserMetadata = async (roomId, userId, updates) => {
    const key = roomUserMetaKey(roomId, userId);

    await redis.hset(key, updates);
    await redis.expire(key, ROOM_TTL_SECONDS);
};

const countUsersInRoom = async (roomId) => {
    return await redis.scard(roomUserSetKey(roomId));
};

// -------------------- ROOM STATE --------------------

const roomExists = async (roomId) => {
    const [room, users] = await Promise.all([
        redis.exists(roomKey(roomId)),
        redis.exists(roomUserSetKey(roomId))
    ]);

    return !!(room || users);
};

const touchRoom = async (roomId) => {
    const setKey = roomUserSetKey(roomId);
    const userIds = await redis.smembers(setKey);

    const pipeline = redis.pipeline();

    pipeline.expire(roomKey(roomId), ROOM_TTL_SECONDS);
    pipeline.expire(setKey, ROOM_TTL_SECONDS);

    // also refresh all user metadata TTLs
    userIds.forEach((userId) => {
        pipeline.expire(roomUserMetaKey(roomId, userId), ROOM_TTL_SECONDS);
    });

    await pipeline.exec();
};

module.exports = {
    getRoom,
    saveRoom,
    deleteRoom,
    addUserToRoom,
    removeUserFromRoom,
    getUsersInRoom,
    getUsersWithMetadata,
    updateUserMetadata,
    countUsersInRoom,
    roomExists,
    touchRoom,
};