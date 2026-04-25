const express = require('express');
const axios = require('axios');
const { redis, roomKey } = require('./redis-client');
const { verifyToken } = require('./services/flix-api');
const { getRoom, saveRoom, deleteRoom, addUserToRoom, countUsersInRoom, removeUserFromRoom, getUsersWithMetadata } = require('./services/wt-redis');

const HOST_RECONNECT_GRACE_MS = Number(process.env.WATCH_TOGETHER_HOST_RECONNECT_GRACE_MS || (1000 * 120));
// Timeout handles are process-local and cannot be serialized to Redis.
// This is acceptable for single-instance operation. For full multi-instance
// support, move reconnect grace handling to a distributed scheduler.
const reconnectTimeouts = new Map();

const createRoomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [key, value] = cookie.trim().split("=");
    cookies[key] = decodeURIComponent(value);
  });

  return cookies;
}

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

const wtcHandlers = (io) => {
	io.use(async (socket, next) => {
		const cookieHeader = socket.handshake.headers.cookie || '';
		const cookies = parseCookies(cookieHeader);
		const sessionObj = cookies['session'] ? JSON.parse(cookies['session']) : null;

		if (!sessionObj?.access) {
			return next(new Error('Authentication error: No access token provided in cookies'));
		}

		const user = await verifyToken(sessionObj.access);

		if (!user) {
			return next(new Error('Authentication error: Invalid access token'));
		}

		socket.user = user;

		next();
	});

	io.on('connection', (socket) => {
		socket.on('join_room', async (payload = {}, cb = () => {}) => {
			const { roomId, token } = payload;
			const user = socket.user;

			const room = await getRoom(roomId);

			if (!room) {
				cb({ success: false });
				socket.emit('room_closed', { roomId });
				return;
			}

			const socketIsHost = room.hostUserId === user.id;

			socket.join(roomId);
			socket.data.roomId = roomId;
			socket.data.isHost = socketIsHost;

			if (socket.data.isHost) {
				clearHostReconnectTimeout(roomId);
				room.hostSocketId = socket.id;
				room.hostDisconnectedAt = null;
				socket.to(roomId).emit('host_reconnected', { roomId });
			}

			room.updatedAt = Date.now();

			await saveRoom(room);
			await addUserToRoom(roomId, user.id, {
				isHost: socketIsHost,
				joinedAt: Date.now(),
			});

			const usersList = await getUsersWithMetadata(roomId);

			io.except(socket.id).to(roomId).emit('user_joined', { 
				userId: user.id, 
				joinedAt: Date.now(),
				isHost: socketIsHost,
			});

			socket.emit('room_joined', {
				roomId,
				isHost: socketIsHost,
				hasActiveHost: Boolean(room.hostSocketId),
				awaitingSync: !socketIsHost && Boolean(room.hostSocketId),
				currentTime: room.currentTime,
				isPlaying: room.isPlaying,
			});

			socket.emit('users', {
				roomId,
				users: usersList,
			});

			if (!socketIsHost && room.hostSocketId) {
				io.to(room.hostSocketId).emit('sync_request', {
					roomId,
					targetSocketId: socket.id,
				});
			}

			cb({ success: true });
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
				isRequest: Boolean(payload.isRequest),
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

			await removeUserFromRoom(roomId, socket.user.id);

			const userLeftPayload = { 
				userId: socket.user.id, 
				leftAt: Date.now(),
				isHost: socket.data.isHost,
			};

			if (socket.data.isHost) {
				userLeftPayload.reconnectGraceMs = HOST_RECONNECT_GRACE_MS;
			}

			io.to(roomId).emit('user_left', userLeftPayload);

			if (room.hostSocketId === socket.id) {
				room.hostSocketId = null;
				room.hostDisconnectedAt = Date.now();
				room.updatedAt = Date.now();

				await saveRoom(room);

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
	wtcHandlers,
};