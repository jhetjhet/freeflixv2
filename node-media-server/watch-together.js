const express = require('express');
const axios = require('axios');

const rooms = new Map();
const ROOM_MAX_AGE = 1000 * 60 * 60 * 24;
const HOST_RECONNECT_GRACE_MS = Number(process.env.WATCH_TOGETHER_HOST_RECONNECT_GRACE_MS || 15000);

const createRoomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getDjangoBaseUrl = () => process.env.DJANGO_URL_PATH || 'http://backend:8000';

const verifyToken = async (token) => {
	if (!token) {
		return null;
	}

	try {
		const response = await axios.get(`${getDjangoBaseUrl()}/auth/users/me/`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			timeout: 5000,
		});

		return response.data;
	} catch (error) {
		return null;
	}
};

const getBearerToken = (value = '') => {
	if (!value.startsWith('Bearer ')) {
		return null;
	}

	return value.slice(7);
};

const ensureMovieExists = async (movieId) => {
	await axios.get(`${getDjangoBaseUrl()}/api/movie/${movieId}/`, {
		timeout: 5000,
	});
};

const clearHostReconnectTimeout = (room) => {
	if (room.hostReconnectTimeout) {
		clearTimeout(room.hostReconnectTimeout);
		room.hostReconnectTimeout = null;
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

	router.post('/create/:movieId', async (req, res) => {
		const token = getBearerToken(req.headers.authorization || '');
		const user = await verifyToken(token);

		if (!user) {
			return res.status(404).json({ detail: 'Not found.' });
		}

		try {
			await ensureMovieExists(req.params.movieId);
		} catch (error) {
			return res.status(404).json({ detail: 'Not found.' });
		}

		const roomId = createRoomId();
		rooms.set(roomId, {
			roomId,
			movieId: req.params.movieId,
			hostUserId: user.id,
			hostSocketId: null,
			hostReconnectTimeout: null,
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

		const room = rooms.get(req.params.roomId);
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

			const room = rooms.get(roomId);
			if (!room) {
				socket.emit('room_closed', { roomId });
				return;
			}

			socket.join(roomId);
			socket.data.roomId = roomId;
			socket.data.userId = user.id;
			socket.data.isHost = room.hostUserId === user.id;

			if (socket.data.isHost) {
				clearHostReconnectTimeout(room);
				room.hostSocketId = socket.id;
				room.hostDisconnectedAt = null;
				socket.to(roomId).emit('host_reconnected', { roomId });
			}

			room.updatedAt = Date.now();

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

		socket.on('play', (payload = {}) => {
			const room = rooms.get(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.isPlaying = true;
			room.updatedAt = Date.now();
			socket.to(payload.roomId).emit('play', buildSyncPayload(payload.roomId, room.currentTime, true, {
				serverTime: payload.serverTime,
			}));
		});

		socket.on('pause', (payload = {}) => {
			const room = rooms.get(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.isPlaying = false;
			room.updatedAt = Date.now();
			socket.to(payload.roomId).emit('pause', buildSyncPayload(payload.roomId, room.currentTime, false, {
				serverTime: payload.serverTime,
			}));
		});

		socket.on('seek', (payload = {}) => {
			const room = rooms.get(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.updatedAt = Date.now();
			socket.to(payload.roomId).emit('seek', buildSyncPayload(payload.roomId, room.currentTime, room.isPlaying, {
				serverTime: payload.serverTime,
			}));
		});

		socket.on('sync', (payload = {}) => {
			const room = rooms.get(payload.roomId);
			if (!room || room.hostSocketId !== socket.id) {
				return;
			}

			room.currentTime = Number(payload.time || 0);
			room.isPlaying = Boolean(payload.isPlaying);
			room.updatedAt = Date.now();

			const syncPayload = buildSyncPayload(payload.roomId, room.currentTime, room.isPlaying, {
				serverTime: payload.serverTime,
			});

			if (payload.targetSocketId) {
				io.to(payload.targetSocketId).emit('sync', syncPayload);
				return;
			}

			socket.to(payload.roomId).emit('sync', syncPayload);
		});

		socket.on('disconnect', () => {
			const { roomId } = socket.data || {};
			if (!roomId) {
				return;
			}

			const room = rooms.get(roomId);
			if (!room) {
				return;
			}

			if (room.hostSocketId === socket.id) {
				room.hostSocketId = null;
				room.hostDisconnectedAt = Date.now();
				room.updatedAt = Date.now();
				io.to(roomId).emit('host_disconnected', {
					roomId,
					reconnectGraceMs: HOST_RECONNECT_GRACE_MS,
				});
				clearHostReconnectTimeout(room);
				room.hostReconnectTimeout = setTimeout(() => {
					const currentRoom = rooms.get(roomId);
					if (!currentRoom || currentRoom.hostSocketId) {
						return;
					}

					rooms.delete(roomId);
					io.to(roomId).emit('room_closed', { roomId });
				}, HOST_RECONNECT_GRACE_MS);
			}
		});
	});
};

setInterval(() => {
	const now = Date.now();
	for (const [roomId, room] of rooms.entries()) {
		if (now - room.updatedAt > ROOM_MAX_AGE) {
			clearHostReconnectTimeout(room);
			rooms.delete(roomId);
		}
	}
}, 1000 * 60 * 30);

module.exports = {
	createWatchTogetherRouter,
	registerWatchTogetherHandlers,
};