const express = require('express');
const axios = require('axios');
const { redis, roomKey } = require('./redis-client');
const { verifyToken } = require('./services/flix-api');
const { getRoom, saveRoom, addUserToRoom, countUsersInRoom, removeUserFromRoom, getUsersWithMetadata } = require('./services/wt-redis');
const { onHostDisconnect, onHostReconnect } = require('./services/room-timer');
const { HOST_RECONNECT_GRACE_MS } = require('./constants');
const { parseCookies, buildSyncPayload } = require('./services/lib');

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
				room.hostSocketId = socket.id;
				room.hostDisconnectedAt = null;

				await onHostReconnect(roomId);
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

				await onHostDisconnect(roomId);
			}
		});
	});
};

module.exports = {
	wtcHandlers,
};