import React, { useCallback } from 'react';
import { useWatchTogetherHostPlayback } from '../../../../helpers/watchtogether/useWatchTogetherHostPlayback';
import { useWatchTogetherHostSocket } from '../../../../helpers/watchtogether/useWatchTogetherHostSocket';
import { VideoPlayerContainer } from './VideoPlayerContainer';
import VideoPlayer from '../VideoPlayer';

const DEBUG_SYNC = true;

export const FlixPlayerHost = ({
	roomId,
	video_url = '',
	subtitles = [],
	syncInterval = 4000,
	onRoomClosed = () => { },
	onError = () => { },
	onUserCountChange = () => { },
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
		setPlaybackRate: () => { },
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
		<VideoPlayerContainer>
			<div className="mt-4 mb-2 w-100 text-center">
				<span className="md-text">{connectionLabel}</span>
			</div>
			{syncNotice && (
				<div className="mb-2 w-100 text-center">
					<span className="sm-text">{syncNotice}</span>
				</div>
			)}
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
				<p className="sm-text" style={{ color: '#666' }}>No video available.</p>
			)}
		</VideoPlayerContainer>
	);
};