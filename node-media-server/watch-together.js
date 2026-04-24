const express = require('express');
const axios = require('axios');
const { redis, roomKey } = require('./redis-client');
const { verifyToken, fetchMovie } = require('./services/flix-api');
const { getRoom, saveRoom, deleteRoom } = require('./services/wt-redis');

const HOST_RECONNECT_GRACE_MS = Number(process.env.WATCH_TOGETHER_HOST_RECONNECT_GRACE_MS || 15000);
// Timeout handles are process-local and cannot be serialized to Redis.
// This is acceptable for single-instance operation. For full multi-instance
// support, move reconnect grace handling to a distributed scheduler.
const reconnectTimeouts = new Map();

const createRoomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getBearerToken = (value = '') => {
	if (!value.startsWith('Bearer ')) {
		return null;
	}

	return value.slice(7);
};

const clearHostReconnectTimeout = (roomId) => {
	const timeoutHandle = reconnectTimeouts.get(roomId);
	if (timeoutHandle) {
		clearTimeout(timeoutHandle);
		reconnectTimeouts.delete(roomId);
	}
};

const buildSyncPayload = (roomId, time, isPlaying, extra = {}) => ({
	roomId,
	time,
	isPlaying,
	serverTime: Number(extra.serverTime) || Date.now(),
	...extra,
});

const createWatchTogetherRouter = () => {
	const router = express.Router();

	// Internal route for service-to-service calls (e.g. Django share view).
	// Authenticated by NODE_SERVICE_TOKEN header instead of user JWT.
	router.get('/internal/:roomId', async (req, res) => {
		const serviceToken = process.env.NODE_SERVICE_TOKEN || '';
		const provided = (req.headers['x-service-token'] || '');
		if (!serviceToken || provided !== serviceToken) {
			return res.status(403).json({ detail: 'Forbidden.' });
		}
		const room = await getRoom(req.params.roomId);
		if (!room) {
			return res.status(404).json({ detail: 'Not found.' });
		}
		return res.json({ roomId: room.roomId, movieId: room.movieId });
	});

	router.post('/create/:movieId', async (req, res) => {
		const token = getBearerToken(req.headers.authorization || '');
		const user = await verifyToken(token);

		if (!user) {
			return res.status(404).json({ detail: 'Not found.' });
		}

		try {
			const resp = await fetchMovie(req.params.movieId);
		} catch (error) {
			return res.status(404).json({ detail: 'Not found.' });
		}

		const roomId = createRoomId();
		await saveRoom({
			roomId,
			movieId: req.params.movieId,
			hostUserId: user.id,
			hostSocketId: null,
			hostDisconnectedAt: null,
			currentTime: 0,
			isPlaying: false,
			updatedAt: Date.now(),
		});

		return res.json({
			roomId,
			movieId: req.params.movieId,
			invitePath: `/watch-together/${roomId}`,
		});
	});

	router.get('/:roomId', async (req, res) => {
		const token = getBearerToken(req.headers.authorization || '');
		const user = await verifyToken(token);

		if (!user) {
			return res.status(404).json({ detail: 'Not found.' });
		}

		const room = await getRoom(req.params.roomId);
		if (!room) {
			return res.status(404).json({ detail: 'Not found.' });
		}

		return res.json({
			roomId: room.roomId,
			movieId: room.movieId,
			isHost: room.hostUserId === user.id,
			hasActiveHost: Boolean(room.hostSocketId),
			currentTime: room.currentTime,
			isPlaying: room.isPlaying,
			syncInterval: Number(process.env.WATCH_TOGETHER_SYNC_INTERVAL || 4000),
		});
	});

	return router;
};

const registerWatchTogetherHandlers = (io) => {
	io.on('connection', (socket) => {
		socket.on('join_room', async (payload = {}) => {
			const { roomId, token } = payload;
			const user = await verifyToken(token);

			if (!user) {
				socket.emit('room_closed', { roomId });
				return;
			}

			const room = await getRoom(roomId);
			if (!room) {
				socket.emit('room_closed', { roomId });
				return;
			}

			socket.join(roomId);
			socket.data.roomId = roomId;
			socket.data.userId = user.id;
			socket.data.isHost = room.hostUserId === user.id;

			if (socket.data.isHost) {
				clearHostReconnectTimeout(roomId);
				room.hostSocketId = socket.id;
				room.hostDisconnectedAt = null;
				socket.to(roomId).emit('host_reconnected', { roomId });
			}

			room.updatedAt = Date.now();
			await saveRoom(room);

			const roomSize = io.sockets.adapter.rooms.get(roomId)?.size ?? 1;
			io.to(roomId).emit('user_count', { roomId, count: roomSize });

			socket.emit('room_joined', {
				roomId,
				isHost: socket.data.isHost,
				hasActiveHost: Boolean(room.hostSocketId),
				awaitingSync: !socket.data.isHost && Boolean(room.hostSocketId),
				currentTime: room.currentTime,
				isPlaying: room.isPlaying,
			});

			if (!socket.data.isHost && room.hostSocketId) {
				io.to(room.hostSocketId).emit('sync', {
					roomId,
					request: true,
					targetSocketId: socket.id,
				});
			}
		});

		socket.on('play', async (payload = {}) => {
			const room = await getRoom(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.isPlaying = true;
			room.updatedAt = Date.now();
			await saveRoom(room);
			socket.to(payload.roomId).emit('play', buildSyncPayload(payload.roomId, room.currentTime, true, {
				serverTime: payload.serverTime,
			}));
		});

		socket.on('pause', async (payload = {}) => {
			const room = await getRoom(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.isPlaying = false;
			room.updatedAt = Date.now();
			await saveRoom(room);
			socket.to(payload.roomId).emit('pause', buildSyncPayload(payload.roomId, room.currentTime, false, {
				serverTime: payload.serverTime,
			}));
		});

		socket.on('seek', async (payload = {}) => {
			const room = await getRoom(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.updatedAt = Date.now();
			await saveRoom(room);
			socket.to(payload.roomId).emit('seek', buildSyncPayload(payload.roomId, room.currentTime, room.isPlaying, {
				serverTime: payload.serverTime,
			}));
		});

		socket.on('sync', async (payload = {}) => {
			const room = await getRoom(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.isPlaying = Boolean(payload.isPlaying);
			room.updatedAt = Date.now();
			await saveRoom(room);

			const syncPayload = buildSyncPayload(payload.roomId, room.currentTime, room.isPlaying, {
				serverTime: payload.serverTime,
			});

			if (payload.targetSocketId) {
				io.to(payload.targetSocketId).emit('sync', syncPayload);
				return;
			}

			socket.to(payload.roomId).emit('sync', syncPayload);
		});

		socket.on('disconnect', async () => {
			const { roomId } = socket.data || {};
			if (!roomId) {
				return;
			}

			const room = await getRoom(roomId);
			if (!room) {
				return;
			}

			const sizeAfterLeave = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
			io.to(roomId).emit('user_count', { roomId, count: sizeAfterLeave });

			if (room.hostSocketId === socket.id) {
				room.hostSocketId = null;
				room.hostDisconnectedAt = Date.now();
				room.updatedAt = Date.now();
				await saveRoom(room);
				io.to(roomId).emit('host_disconnected', {
					roomId,
					reconnectGraceMs: HOST_RECONNECT_GRACE_MS,
				});
				clearHostReconnectTimeout(roomId);
				const timeoutHandle = setTimeout(async () => {
					const currentRoom = await getRoom(roomId);
					if (!currentRoom || currentRoom.hostSocketId) {
						return;
					}

					await deleteRoom(roomId);
					reconnectTimeouts.delete(roomId);
					io.to(roomId).emit('room_closed', { roomId });
				}, HOST_RECONNECT_GRACE_MS);

				reconnectTimeouts.set(roomId, timeoutHandle);
			}
		});
	});
};

module.exports = {
	createWatchTogetherRouter,
	registerWatchTogetherHandlers,
};