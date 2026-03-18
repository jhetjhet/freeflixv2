import React from 'react';
import { FlixPlayerHost } from './watchtogether/FlixPlayerHost';
import { FlixPlayerClient } from './watchtogether/FlixPlayerClient';
import VideoPlayer from './VideoPlayer';

export const MoviePlayer = ({ id = null, video_url = "", subtitles = [] }) => {
	return (
		<div className="d-flex flex-column align-items-center justify-content-center">
			<div
				className="mt-4"
				style={{
					boxShadow: '0 4px 24px rgba(0,0,0,0.9), 0 1.5px 8px rgba(255,255,255,0.08) inset',
					borderRadius: '12px',
					overflow: 'hidden',
					background: '#111',
					width: 'calc(100% - 2rem)',
				}}
			>
				{video_url ? (
					<VideoPlayer
						id={id}
						video_url={`${process.env.REACT_APP_MEDIA_URL}${video_url}`}
						subtitles={subtitles}
					/>
				) : (
					<div style={{
						minHeight: '360px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center'
					}}>
						<p>No video available.</p>
					</div>
				)}
			</div>
		</div>
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
		/>
	);
};