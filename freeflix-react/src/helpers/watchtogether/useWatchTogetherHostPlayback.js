import { useCallback, useEffect, useRef, useState } from 'react';

const SYNC_NOTICE_DURATION_MS = 1500;

export const useWatchTogetherHostPlayback = ({ debug = false } = {}) => {
	const playerRef = useRef(null);
	const currentTimeRef = useRef(0);
	const syncNoticeTimeoutRef = useRef(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [playerReady, setPlayerReady] = useState(false);
	const [connectionLabel, setConnectionLabel] = useState('Host controls enabled');
	const [syncNotice, setSyncNotice] = useState('');

	const logDebug = useCallback((event, details = {}) => {
		if (!debug) {
			return;
		}

		console.log(`[watch-sync-host] ${event}`, details);
	}, [debug]);

	useEffect(() => () => {
		if (syncNoticeTimeoutRef.current) {
			window.clearTimeout(syncNoticeTimeoutRef.current);
		}
	}, []);

	const getCurrentTime = useCallback(() => {
		if (!playerRef.current) {
			return Number.isFinite(currentTimeRef.current) ? currentTimeRef.current : 0;
		}

		return playerRef.current.getCurrentTime() || currentTimeRef.current || 0;
	}, []);

	const updateSyncNotice = useCallback((notice = '') => {
		if (syncNoticeTimeoutRef.current) {
			window.clearTimeout(syncNoticeTimeoutRef.current);
			syncNoticeTimeoutRef.current = null;
		}

		setSyncNotice(notice);

		if (notice) {
			syncNoticeTimeoutRef.current = window.setTimeout(() => {
				setSyncNotice('');
				syncNoticeTimeoutRef.current = null;
			}, SYNC_NOTICE_DURATION_MS);
		}
	}, []);

	const handleRemotePlaybackEvent = useCallback(() => true, []);

	const handlePlayerReady = useCallback(() => {
		setPlayerReady(true);
		logDebug('player-ready');
	}, [logDebug]);

	const handleBuffer = useCallback(() => {}, []);

	const handleBufferEnd = useCallback(() => {}, []);

	const handleProgress = useCallback(({ playedSeconds }) => {
		currentTimeRef.current = playedSeconds;
	}, []);

	const handlePlay = useCallback((emitPlay) => {
		setIsPlaying(true);
		updateSyncNotice('');
		emitPlay();
	}, [updateSyncNotice]);

	const handlePause = useCallback((emitPause) => {
		setIsPlaying(false);
		currentTimeRef.current = getCurrentTime();
		updateSyncNotice('');
		emitPause();
	}, [getCurrentTime, updateSyncNotice]);

	const handleSeek = useCallback((time) => {
		currentTimeRef.current = time;
	}, []);

	return {
		connectionLabel,
		handleBuffer,
		handleBufferEnd,
		handlePause,
		handlePlay,
		handlePlayerReady,
		handleProgress,
		handleRemotePlaybackEvent,
		handleSeek,
		isPlaying,
		playerReady,
		playerRef,
		setConnectionLabel,
		setIsPlaying,
		shouldShowPlayer: true,
		syncNotice,
		getCurrentTime,
		playbackRate: 1,
		setPlaybackRate: () => {},
	};
};