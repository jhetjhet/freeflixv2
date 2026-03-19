import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useWatchTogetherClientSocket = ({
	roomId,
	debug = false,
	hasInitialSync,
	handleRemotePlaybackEvent,
	setConnectionLabel,
	setHasInitialSync,
	setIsPlaying,
	onRoomClosed,
	onError,
	onUserCountChange = () => {},
}) => {
	const socketRef = useRef(null);
	const hasInitialSyncRef = useRef(hasInitialSync);

	useEffect(() => {
		hasInitialSyncRef.current = hasInitialSync;
	}, [hasInitialSync]);

	const latestHandlersRef = useRef({
		handleRemotePlaybackEvent,
		setConnectionLabel,
		setHasInitialSync,
		setIsPlaying,
		onRoomClosed,
		onError,
		onUserCountChange,
	});

	useEffect(() => {
		latestHandlersRef.current = {
			handleRemotePlaybackEvent,
			setConnectionLabel,
			setHasInitialSync,
			setIsPlaying,
			onRoomClosed,
			onError,
			onUserCountChange,
		};
	}, [handleRemotePlaybackEvent, setConnectionLabel, setHasInitialSync, setIsPlaying, onRoomClosed, onError, onUserCountChange]);

	const logDebug = useCallback((event, details = {}) => {
		if (!debug) {
			return;
		}

		console.log(`[watch-socket-client] ${event}`, details);
	}, [debug]);

	useEffect(() => {
		const token = localStorage.getItem('access_token');
		const socket = io(window.location.origin, {
			path: '/node/socket.io',
			transports: ['websocket', 'polling'],
		});

		socketRef.current = socket;

		socket.on('connect', () => {
			logDebug('connect', { roomId, isHost: false });
			latestHandlersRef.current.setConnectionLabel('Joining watch room...');
			socket.emit('join_room', {
				roomId,
				token,
			});
		});

		socket.on('disconnect', () => {
			logDebug('disconnect', { roomId, isHost: false });
			latestHandlersRef.current.setConnectionLabel('Disconnected from watch room');
		});

		socket.on('room_joined', (payload) => {
			logDebug('room_joined', payload);
			const handlers = latestHandlersRef.current;

			if (payload.awaitingSync) {
				handlers.setConnectionLabel('Waiting for host sync...');
				handlers.setHasInitialSync(false);
				handlers.setIsPlaying(false);
				socket.emit('sync', {
					roomId,
					request: true,
					targetSocketId: socket.id,
				});
				return;
			}

			handlers.setConnectionLabel('Waiting for first sync...');
			handlers.setHasInitialSync(false);
			handlers.setIsPlaying(false);

			socket.emit('sync', {
				roomId,
				request: true,
				targetSocketId: socket.id,
			});
		});

		socket.on('play', (payload) => {
			logDebug('play', payload);
			latestHandlersRef.current.handleRemotePlaybackEvent(payload, {
				ensureIsPlaying: true,
				connectionLabel: 'Following host playback',
				showNotice: false,
			});
		});

		socket.on('pause', (payload) => {
			logDebug('pause', payload);
			latestHandlersRef.current.handleRemotePlaybackEvent(payload, {
				ensureIsPlaying: false,
				connectionLabel: 'Following host playback',
				showNotice: false,
			});
		});

		socket.on('sync', (payload) => {
			logDebug('sync', payload);

			if (payload.request) {
				return;
			}

			if (!hasInitialSyncRef.current) {
				latestHandlersRef.current.handleRemotePlaybackEvent(payload, {
					ensureIsPlaying: Boolean(payload.isPlaying),
					markInitialSync: true,
					forceSeek: true,
					connectionLabel: 'Connected to host',
					showNotice: false,
				});
				return;
			}

			latestHandlersRef.current.handleRemotePlaybackEvent(payload, {
				ensureIsPlaying: Boolean(payload.isPlaying),
				connectionLabel: 'Following host playback',
				showNotice: true,
			});
		});

		socket.on('host_disconnected', (payload) => {
			logDebug('host_disconnected', payload);
			latestHandlersRef.current.setConnectionLabel(`Host disconnected. Waiting ${Math.round((payload?.reconnectGraceMs || 0) / 1000)}s for reconnect...`);
			latestHandlersRef.current.setIsPlaying(false);
		});

		socket.on('host_reconnected', () => {
			logDebug('host_reconnected');
			latestHandlersRef.current.setConnectionLabel('Host reconnected. Resyncing...');
			latestHandlersRef.current.setHasInitialSync(false);
		});

		socket.on('room_closed', () => {
			logDebug('room_closed');
			latestHandlersRef.current.onRoomClosed();
		});

		socket.on('error', (payload) => {
			logDebug('error', payload);
			latestHandlersRef.current.onError(payload?.message || 'Watch Together connection failed.');
		});

		socket.on('user_count', (payload) => {
			logDebug('user_count', payload);
			latestHandlersRef.current.onUserCountChange(payload.count);
		});

		return () => {
			socket.disconnect();

			if (socketRef.current === socket) {
				socketRef.current = null;
			}
		};
	}, [roomId, logDebug]);

	const emitPlay = useCallback(() => {}, []);

	const emitPause = useCallback(() => {}, []);

	return {
		emitPause,
		emitPlay,
	};
};