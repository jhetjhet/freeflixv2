import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useWatchTogetherHostSocket = ({
	roomId,
	syncInterval = 4000,
	debug = false,
	getCurrentTime,
	isPlaying,
	setConnectionLabel,
	onRoomClosed,
	onError,
}) => {
	const socketRef = useRef(null);
	const isPlayingRef = useRef(false);
	const latestHandlersRef = useRef({
		getCurrentTime,
		setConnectionLabel,
		onRoomClosed,
		onError,
	});

	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);

	useEffect(() => {
		latestHandlersRef.current = {
			getCurrentTime,
			setConnectionLabel,
			onRoomClosed,
			onError,
		};
	}, [getCurrentTime, setConnectionLabel, onRoomClosed, onError]);

	const logDebug = useCallback((event, details = {}) => {
		if (!debug) {
			return;
		}

		console.log(`[watch-socket-host] ${event}`, details);
	}, [debug]);

	useEffect(() => {
		const token = localStorage.getItem('access_token');
		const socket = io(window.location.origin, {
			path: '/node/socket.io',
			transports: ['websocket', 'polling'],
		});

		let syncIntervalId = null;
		socketRef.current = socket;

		socket.on('connect', () => {
			logDebug('connect', { roomId, isHost: true });
			latestHandlersRef.current.setConnectionLabel('Host connected');
			socket.emit('join_room', {
				roomId,
				token,
			});
		});

		socket.on('disconnect', () => {
			logDebug('disconnect', { roomId, isHost: true });
			latestHandlersRef.current.setConnectionLabel('Disconnected from watch room');
		});

		socket.on('room_joined', (payload) => {
			logDebug('room_joined', payload);
			if (payload.isHost) {
				latestHandlersRef.current.setConnectionLabel('Host connected');
			}
		});

		socket.on('sync', (payload) => {
			logDebug('sync', payload);

			if (!payload.request) {
				return;
			}

			socket.emit('sync', {
				roomId,
				time: latestHandlersRef.current.getCurrentTime(),
				isPlaying: isPlayingRef.current,
				serverTime: Date.now(),
				targetSocketId: payload.targetSocketId,
			});
		});

		socket.on('room_closed', () => {
			logDebug('room_closed');
			latestHandlersRef.current.onRoomClosed();
		});

		socket.on('error', (payload) => {
			logDebug('error', payload);
			latestHandlersRef.current.onError(payload?.message || 'Watch Together connection failed.');
		});

		syncIntervalId = window.setInterval(() => {
			if (!socket.connected) {
				return;
			}

			if (debug) {
				logDebug('emit_sync', {
					roomId,
					time: latestHandlersRef.current.getCurrentTime(),
					isPlaying: isPlayingRef.current,
				});
			}

			socket.emit('sync', {
				roomId,
				time: latestHandlersRef.current.getCurrentTime(),
				isPlaying: isPlayingRef.current,
				serverTime: Date.now(),
			});
		}, syncInterval || 4000);

		return () => {
			if (syncIntervalId) {
				window.clearInterval(syncIntervalId);
			}

			socket.disconnect();

			if (socketRef.current === socket) {
				socketRef.current = null;
			}
		};
	}, [roomId, syncInterval, debug, logDebug]);

	const emitPlay = useCallback(() => {
		if (!socketRef.current) {
			return;
		}

		const currentTime = latestHandlersRef.current.getCurrentTime();

		logDebug('emit_play', { roomId, time: currentTime });
		socketRef.current.emit('play', {
			roomId,
			time: currentTime,
			serverTime: Date.now(),
		});
	}, [roomId, logDebug]);

	const emitPause = useCallback(() => {
		if (!socketRef.current) {
			return;
		}

		const currentTime = latestHandlersRef.current.getCurrentTime();

		logDebug('emit_pause', { roomId, time: currentTime });
		socketRef.current.emit('pause', {
			roomId,
			time: currentTime,
			serverTime: Date.now(),
		});
	}, [roomId, logDebug]);

	return {
		emitPause,
		emitPlay,
	};
};