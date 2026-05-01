const { Queue } = require('bullmq');
const { redis, roomHostKey, roomHostJobIdKey } = require('../redis-client');
const { HOST_RECONNECT_GRACE_MS } = require('../constants');

const cleanupQueue = new Queue('room-cleanup', {
  connection: redis
});

async function onHostDisconnect(roomId) {
  // mark host disconnected
  await redis.set(roomHostKey(roomId), 'disconnected');

  // schedule cleanup after HOST_RECONNECT_GRACE_MS
  const job = await cleanupQueue.add(
    'cleanup-room',
    { roomId },
    {
      delay: HOST_RECONNECT_GRACE_MS
    }
  );

  const disconnectScheduledAt = new Date(Date.now() + HOST_RECONNECT_GRACE_MS).toISOString();

  // store jobId so we can cancel later
  await redis.set(roomHostJobIdKey(roomId), job.id);
}

async function onHostReconnect(roomId) {
  await redis.set(roomHostKey(roomId), 'connected');

  const jobId = await redis.get(roomHostJobIdKey(roomId));

  if (jobId) {
    const job = await cleanupQueue.getJob(jobId);
    if (job) {
      await job.remove(); // cancel timer
    }
  }
}

module.exports = { 
    cleanupQueue,
    onHostDisconnect,
    onHostReconnect
};