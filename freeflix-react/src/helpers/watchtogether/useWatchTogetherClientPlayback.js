import { useCallback, useEffect, useRef, useState } from 'react';

const SYNC_NOTICE_DURATION_MS = 1500;
const RESYNC_SEEK_THRESHOLD_SECONDS = 2.5;

export const useWatchTogetherClientPlayback = ({ debug = false } = {}) => {
	const playerRef = useRef(null);
	const currentTimeRef = useRef(0);
	const syncNoticeTimeoutRef = useRef(null);
	const pendingRemoteStateRef = useRef(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [playerReady, setPlayerReady] = useState(false);
	const [hasInitialSync, setHasInitialSync] = useState(false);
	const [connectionLabel, setConnectionLabel] = useState('Connecting to host...');
	const [syncNotice, setSyncNotice] = useState('');

	const logDebug = useCallback((event, details = {}) => {
		if (!debug) {
			return;
		}

		console.log(`[watch-sync-client] ${event}`, details);
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

	const seekTo = useCallback((time) => {
		logDebug('seek-to', { time });

		if (!playerRef.current || !Number.isFinite(time)) {
			return;
		}

		playerRef.current.seekTo(time, 'seconds');
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

	const applyIncomingPlaybackState = useCallback((payload, options = {}) => {
		const nextTime = Number(payload?.time);
		const nextIsPlaying = typeof options.ensureIsPlaying === 'boolean'
			? options.ensureIsPlaying
			: Boolean(payload?.isPlaying);

		if (!Number.isFinite(nextTime)) {
			return;
		}

		logDebug('apply-remote-state', {
			payload,
			options,
			nextTime,
			nextIsPlaying,
		});

		const localTime = getCurrentTime();
		const driftSeconds = Math.abs(nextTime - localTime);
		const shouldSeek = Boolean(options.forceSeek) || driftSeconds >= RESYNC_SEEK_THRESHOLD_SECONDS;

		if (shouldSeek) {
			seekTo(nextTime);
			currentTimeRef.current = nextTime;
		} else {
			currentTimeRef.current = localTime;
		}

		setIsPlaying(nextIsPlaying);
		updateSyncNotice(options.showNotice && shouldSeek ? 'Synced with host...' : '');
	}, [getCurrentTime, logDebug, seekTo, updateSyncNotice]);

	const commitRemoteState = useCallback((payload, options = {}) => {
		applyIncomingPlaybackState(payload, options);

		if (options.markInitialSync) {
			setHasInitialSync(true);
		}

		if (options.connectionLabel) {
			setConnectionLabel(options.connectionLabel);
		}
	}, [applyIncomingPlaybackState]);

	const handleRemotePlaybackEvent = useCallback((payload, options = {}) => {
		if (!playerReady) {
			logDebug('skip-remote-event-until-ready', { payload, options });
			pendingRemoteStateRef.current = { payload, options };
			return false;
		}

		commitRemoteState(payload, options);
		return true;
	}, [commitRemoteState, logDebug, playerReady]);

	const handlePlayerReady = useCallback(() => {
		setPlayerReady(true);
		logDebug('player-ready');

		if (pendingRemoteStateRef.current) {
			const { payload, options } = pendingRemoteStateRef.current;
			pendingRemoteStateRef.current = null;
			commitRemoteState(payload, options);
		}
	}, [commitRemoteState, logDebug]);

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
		hasInitialSync,
		isPlaying,
		playerReady,
		playerRef,
		setConnectionLabel,
		setHasInitialSync,
		setIsPlaying,
		shouldShowPlayer: hasInitialSync && playerReady,
		syncNotice,
		getCurrentTime,
		playbackRate: 1,
		setPlaybackRate: () => {},
	};
};