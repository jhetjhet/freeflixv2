import React from 'react';
import { FlixPlayerHost } from './watchtogether/FlixPlayerHost';
import { FlixPlayerClient } from './watchtogether/FlixPlayerClient';
import { VideoPlayerContainer } from './watchtogether/VideoPlayerContainer';
import VideoPlayer from './VideoPlayer';

export const MoviePlayer = ({ id = null, video_url = "", subtitles = [] }) => {
	return (
		<VideoPlayerContainer>
			{video_url ? (
				<div style={{ width: '100%' }}>
					<VideoPlayer
						id={id}
						video_url={`${process.env.REACT_APP_MEDIA_URL}${video_url}`}
						subtitles={subtitles}
					/>
				</div>
			) : (
				<p className="sm-text" style={{ color: '#666' }}>No video available.</p>
			)}
		</VideoPlayerContainer>
	);
};

export const WatchTogetherPlayer = ({
	roomId,
	video_url = "",
	subtitles = [],
	isHost = false,
	syncInterval = 4000,
	onRoomClosed = () => { },
	onError = () => { },
	onUserCountChange = () => { },
}) => {
	if (isHost) {
		return (
			<FlixPlayerHost
				roomId={roomId}
				video_url={video_url}
				subtitles={subtitles}
				syncInterval={syncInterval}
				onRoomClosed={onRoomClosed}
				onError={onError}
				onUserCountChange={onUserCountChange}
			/>
		);
	}

	return (
		<FlixPlayerClient
			roomId={roomId}
			video_url={video_url}
			subtitles={subtitles}
			syncInterval={syncInterval}
			onRoomClosed={onRoomClosed}
			onError={onError}
			onUserCountChange={onUserCountChange}
		/>
	);
};