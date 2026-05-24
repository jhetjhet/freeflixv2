'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { router: streamRouter, shutdown: shutdownStream } = require('./routes/stream');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8081;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ service: 'torrent-worker', status: 'ok' }));

// All streaming routes live under /stream
app.use('/stream', streamRouter);

const startServer = async () => {
    server.listen(PORT, () => {
        console.log(`[torrent-worker] listening on port ${PORT}`);
    });
};

startServer().catch((err) => {
    console.error('[torrent-worker] failed to start:', err);
    process.exit(1);
});

// Graceful shutdown — drain WebTorrent before the container stops.
// Docker sends SIGTERM on `docker stop`; PM2/K8s also use SIGTERM.
async function gracefulShutdown(signal) {
    console.log(`[torrent-worker] ${signal} received, shutting down...`);
    await shutdownStream();
    server.close(() => {
        console.log('[torrent-worker] HTTP server closed');
        process.exit(0);
    });
    // Force-exit if still hanging after 10 s
    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
