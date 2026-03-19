import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ClientCustomControl } from './ClientCustomControl';
import { useWatchTogetherClientPlayback } from '../../../../helpers/watchtogether/useWatchTogetherClientPlayback';
import { useWatchTogetherClientSocket } from '../../../../helpers/watchtogether/useWatchTogetherClientSocket';
import VideoPlayer from '../VideoPlayer';

const DEBUG_SYNC = true;
const CONTROL_HIDE_DELAY_MS = 1800;

export const FlixPlayerClient = ({
	roomId,
	video_url = '',
	subtitles = [],
	onRoomClosed = () => {},
	onError = () => {},
	onUserCountChange = () => {},
}) => {
	const [hasJoinedPlayback, setHasJoinedPlayback] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [areControlsVisible, setAreControlsVisible] = useState(false);
	const [volume, setVolume] = useState(0.8);
	const [isMuted, setIsMuted] = useState(false);
	const playerContainerRef = useRef(null);
	const hideControlsTimeoutRef = useRef(null);

	const {
		connectionLabel,
		handleBuffer,
		handleBufferEnd,
		handlePause: syncHandlePause,
		handlePlay: syncHandlePlay,
		handlePlayerReady,
		handleProgress,
		handleRemotePlaybackEvent,
		handleSeek: syncHandleSeek,
		hasInitialSync,
		isPlaying,
		playerReady,
		playbackRate,
		playerRef,
		setConnectionLabel,
		setHasInitialSync,
		setIsPlaying,
		shouldShowPlayer,
		syncNotice,
	} = useWatchTogetherClientPlayback({
		debug: DEBUG_SYNC,
	});

	const { emitPause, emitPlay } = useWatchTogetherClientSocket({
		roomId,
		debug: DEBUG_SYNC,
		hasInitialSync,
		handleRemotePlaybackEvent,
		setConnectionLabel,
		setHasInitialSync,
		setIsPlaying,
		onRoomClosed,
		onError,
		onUserCountChange,
	});

	const handlePlay = useCallback(() => {
		syncHandlePlay(emitPlay);
	}, [emitPlay, syncHandlePlay]);

	const handlePause = useCallback(() => {
		syncHandlePause(emitPause);
	}, [emitPause, syncHandlePause]);

	const handleSeek = useCallback((time) => {
		syncHandleSeek(time);
	}, [syncHandleSeek]);

	const isJoinReady = playerReady && hasInitialSync;
	const shouldShowJoinOverlay = video_url && !hasJoinedPlayback;
	const shouldAttemptPlayback = hasJoinedPlayback && shouldShowPlayer && isPlaying;
	const overlayTitle = isJoinReady ? 'Ready to join synchronized playback' : 'Preparing synchronized playback...';
	const overlayMessage = isJoinReady
		? 'Click Join once to let your browser start playback and follow the host.'
		: playerReady
			? 'Waiting for the host to send the first clock sync in the background.'
			: 'Waiting for the player to finish loading in the background.';

	const handleJoinPlayback = useCallback(() => {
		if (!isJoinReady) {
			return;
		}

		setHasJoinedPlayback(true);
	}, [isJoinReady]);

	const handleFullscreenToggle = useCallback(async () => {
		const container = playerContainerRef.current;

		if (!container) {
			return;
		}

		try {
			if (document.fullscreenElement === container) {
				await document.exitFullscreen();
				return;
			}

			await container.requestFullscreen();
		} catch (error) {
			console.error('Failed to toggle fullscreen mode.', error);
		}
	}, []);

	const handleToggleMute = useCallback(() => {
		setIsMuted(previousIsMuted => !previousIsMuted);
	}, []);

	const handleVolumeChange = useCallback((event) => {
		const nextVolume = Number(event.target.value);
		setVolume(nextVolume);

		if (nextVolume <= 0) {
			setIsMuted(true);
			return;
		}

		setIsMuted(false);
	}, []);

	const clearHideControlsTimeout = useCallback(() => {
		if (hideControlsTimeoutRef.current) {
			window.clearTimeout(hideControlsTimeoutRef.current);
			hideControlsTimeoutRef.current = null;
		}
	}, []);

	const scheduleHideControls = useCallback(() => {
		clearHideControlsTimeout();
		hideControlsTimeoutRef.current = window.setTimeout(() => {
			setAreControlsVisible(false);
			hideControlsTimeoutRef.current = null;
		}, CONTROL_HIDE_DELAY_MS);
	}, [clearHideControlsTimeout]);

	const handlePlayerMouseMove = useCallback(() => {
		if (!shouldShowPlayer || shouldShowJoinOverlay) {
			return;
		}

		setAreControlsVisible(true);
		scheduleHideControls();
	}, [scheduleHideControls, shouldShowJoinOverlay, shouldShowPlayer]);

	const handlePlayerMouseLeave = useCallback(() => {
		clearHideControlsTimeout();
		setAreControlsVisible(false);
	}, [clearHideControlsTimeout]);

	const handleControlInteract = useCallback(() => {
		setAreControlsVisible(true);
		scheduleHideControls();
	}, [scheduleHideControls]);

	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, []);

	useEffect(() => () => {
		clearHideControlsTimeout();
	}, [clearHideControlsTimeout]);

	useEffect(() => {
		if (!shouldShowPlayer || shouldShowJoinOverlay) {
			clearHideControlsTimeout();
			setAreControlsVisible(false);
		}
	}, [clearHideControlsTimeout, shouldShowJoinOverlay, shouldShowPlayer]);

	return (
		<div className="d-flex flex-column align-items-center justify-content-center">
			<div className="mt-4 mb-2 w-100 text-center">
				<span className="md-text">{connectionLabel}</span>
			</div>
			{syncNotice && (
				<div className="mb-2 w-100 text-center">
					<span className="sm-text">{syncNotice}</span>
				</div>
			)}
			{!hasInitialSync && (
				<div className="mb-2 w-100 text-center">
					<span className="sm-text">Waiting for the host clock before playback starts.</span>
				</div>
			)}
			<div
				className="mt-2"
				ref={playerContainerRef}
				onMouseMove={handlePlayerMouseMove}
				onMouseLeave={handlePlayerMouseLeave}
				style={{
					boxShadow: '0 4px 24px rgba(0,0,0,0.9), 0 1.5px 8px rgba(255,255,255,0.08) inset',
					borderRadius: '12px',
					overflow: 'hidden',
					background: '#111',
					position: 'relative',
					width: 'calc(100% - 2rem)',
					minHeight: '360px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				{shouldShowJoinOverlay && (
					<div
						className="w-100 h-100 text-center"
						style={{
							position: 'absolute',
							inset: 0,
							zIndex: 2,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '0.75rem',
							padding: '2rem 1.5rem',
							background: 'rgba(0, 0, 0, 0.82)',
							color: '#fff',
						}}
					>
						<p className="mb-1 md-text">{overlayTitle}</p>
						<p className="sm-text mb-0" style={{ maxWidth: '32rem' }}>{overlayMessage}</p>
						{isJoinReady ? (
							<button
								type="button"
								className="btn btn-light"
								onClick={handleJoinPlayback}
							>
								Join
							</button>
						) : (
							<span className="sm-text">Sync is still getting ready.</span>
						)}
					</div>
				)}
				{video_url && !shouldShowJoinOverlay && shouldShowPlayer && (
					<ClientCustomControl
						areControlsVisible={areControlsVisible}
						isFullscreen={isFullscreen}
						isMuted={isMuted}
						volume={volume}
						onInteract={handleControlInteract}
						onToggleFullscreen={handleFullscreenToggle}
						onToggleMute={handleToggleMute}
						onVolumeChange={handleVolumeChange}
					/>
				)}
				{video_url ? (
					<>
						<div style={{ width: '100%', visibility: shouldShowPlayer ? 'visible' : 'hidden' }}>
							<VideoPlayer
								video_url={`${process.env.REACT_APP_MEDIA_URL}${video_url}`}
								subtitles={subtitles}
								playerRef={playerRef}
								isPlaying={shouldAttemptPlayback}
								playbackRate={playbackRate}
								controls={false}
								volume={volume}
								muted={isMuted}
								onPlay={handlePlay}
								onPause={handlePause}
								onSeek={handleSeek}
								onReady={handlePlayerReady}
								onBuffer={handleBuffer}
								onBufferEnd={handleBufferEnd}
								onProgress={handleProgress}
								onError={(e) => console.error('>>> Player error:', e)}
							/>
						</div>
						{!shouldShowPlayer && (
							<div className="w-100 text-center" style={{ color: '#fff', padding: '2rem 1.5rem' }}>
								<p className="mb-2">Preparing synchronized playback...</p>
								<p className="sm-text mb-0">{playerReady ? 'The video will appear after the host sends the first clock sync.' : 'Waiting for the player to finish loading.'}</p>
							</div>
						)}
					</>
				) : (
					<div>
						<p>No video available.</p>
					</div>
				)}
			</div>
		</div>
	);
};