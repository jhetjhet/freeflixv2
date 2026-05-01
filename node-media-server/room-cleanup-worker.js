const { Worker } = require('bullmq');
const { redis, roomHostKey, roomKey, roomHostJobIdKey } = require('./redis-client');
const { purgeRoom } = require('./services/wt-redis');

const worker = new Worker(
  'room-cleanup',
  async (job) => {
    const { roomId } = job.data;

    const hostStatus = await redis.get(roomHostKey(roomId));

    // SAFETY CHECK
    if (hostStatus === 'disconnected') {
      console.log(`Cleaning room ${roomId}`);

      await purgeRoom(roomId);

      console.log(`Room ${roomId} cleaned up`);
    } else {
      console.log(`Skipped cleanup, host reconnected`);
    }
  },
  { connection: redis }
);

worker.on('active', (job) => {
    console.log(`[Worker] Processing job ${job.id} for room ${job.data.roomId}`);
});

worker.on('error', (err) => {
    console.error('[Worker] Error:', err);
});

worker.on('completed', (job) => {
    console.log(`[Worker] Job done: ${job.id} for room ${job.data.roomId}`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Job failed: ${job.id} for room ${job.data.roomId}`, err);
});

console.log('[Worker] Room cleanup worker started');
