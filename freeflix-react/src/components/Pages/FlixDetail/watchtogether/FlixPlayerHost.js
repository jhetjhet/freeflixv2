import React, { useCallback } from 'react';
import { useWatchTogetherHostPlayback } from '../../../../helpers/watchtogether/useWatchTogetherHostPlayback';
import { useWatchTogetherHostSocket } from '../../../../helpers/watchtogether/useWatchTogetherHostSocket';
import VideoPlayer from '../VideoPlayer';

const DEBUG_SYNC = true;

export const FlixPlayerHost = ({
	roomId,
	video_url = '',
	subtitles = [],
	syncInterval = 4000,
	onRoomClosed = () => {},
	onError = () => {},
	onUserCountChange = () => {},
}) => {
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
		isPlaying,
		playbackRate,
		playerRef,
		setConnectionLabel,
		setIsPlaying,
		shouldShowPlayer,
		syncNotice,
		getCurrentTime,
	} = useWatchTogetherHostPlayback({
		debug: DEBUG_SYNC,
	});

	const { emitPause, emitPlay } = useWatchTogetherHostSocket({
		roomId,
		syncInterval,
		debug: DEBUG_SYNC,
		getCurrentTime,
		isPlaying,
		handleRemotePlaybackEvent,
		setConnectionLabel,
		setIsPlaying,
		setPlaybackRate: () => {},
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
			<div
				className="mt-2"
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
				{video_url ? (
					<div style={{ width: '100%', visibility: shouldShowPlayer ? 'visible' : 'hidden' }}>
						<VideoPlayer
							video_url={`${process.env.REACT_APP_MEDIA_URL}${video_url}`}
							subtitles={subtitles}
							playerRef={playerRef}
							isPlaying={isPlaying}
							playbackRate={playbackRate}
							onPlay={handlePlay}
							onPause={handlePause}
							onSeek={handleSeek}
							onReady={handlePlayerReady}
							onBuffer={handleBuffer}
							onBufferEnd={handleBufferEnd}
							onProgress={handleProgress}
						/>
					</div>
				) : (
					<div>
						<p>No video available.</p>
					</div>
				)}
			</div>
		</div>
	);
};