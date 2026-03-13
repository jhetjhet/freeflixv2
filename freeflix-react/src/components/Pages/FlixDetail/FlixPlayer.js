import React, { useMemo, useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { FlixPlayerHost } from './watchtogether/FlixPlayerHost';
import { FlixPlayerClient } from './watchtogether/FlixPlayerClient';

const STORAGE_KEY = "video-progress";
const MAX_VIDEOS = 20;
const formatTime = (seconds) => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// helpers
const getProgressStore = () => {
	const raw = localStorage.getItem(STORAGE_KEY);
	return raw ? JSON.parse(raw) : {};
};

const saveProgressStore = (store) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const saveVideoProgress = (videoId, time) => {
	let store = getProgressStore();

	store[videoId] = {
		time,
		updated: Date.now()
	};

	// enforce limit (20 videos)
	const entries = Object.entries(store)
		.sort((a, b) => b[1].updated - a[1].updated)
		.slice(0, MAX_VIDEOS);

	store = Object.fromEntries(entries);

	saveProgressStore(store);
};

const removeVideoProgress = (videoId) => {
	const store = getProgressStore();
	delete store[videoId];
	saveProgressStore(store);
};

const getVideoProgress = (videoId) => {
	const store = getProgressStore();
	return store[videoId]?.time || null;
};

const VideoPlayer = ({ id, video_url, subtitles = [] }) => {
	const playerRef = useRef(null);
	const initialSaved = useRef();

	const [isPlaying, setIsPlaying] = useState(false);
	const [savedTime, setSavedTime] = useState(null);
	const [resumePrompt, setResumePrompt] = useState(false);

	const tracks = useMemo(() => subtitles.map(sub => ({
		kind: 'subtitles',
		src: sub.subtitle,
		label: sub.name,
		srcLang: sub.srclng,
		default: sub.is_default,
	})), [subtitles]);

	// Load saved progress
	useEffect(() => {
		const saved = getVideoProgress(id);

		initialSaved.current = saved;
		let timeOut = null;

		if (saved && saved > 5) {
			setSavedTime(saved);
			setResumePrompt(true);

			timeOut = setTimeout(() => {
				setResumePrompt(false);
			}, 10000);
		}

		return () => {
			if (timeOut) {
				clearTimeout(timeOut);
			}
		};
	}, [id]);

	const handleProgress = ({ playedSeconds, played }) => {
		// remove if nearly finished
		if (initialSaved.current < playedSeconds) {
			setResumePrompt(false);
			initialSaved.current = null;
		}

		if (played === 0) {
			return;
		}

		if (played > 0.95) {
			removeVideoProgress(id);
			return;
		}

		saveVideoProgress(id, playedSeconds);
	};

	const handleEnded = () => {
		removeVideoProgress(id);
	};

	const handleResume = () => {
		if (playerRef.current && savedTime) {
			playerRef.current.seekTo(savedTime, "seconds");
		}

		setIsPlaying(true);
		setResumePrompt(false);
	};

	return (
		<div className="videoplayer position-relative">

			{resumePrompt && (
				<div
					style={{
						position: "absolute",
						// inset: 0,
						width: "100%",
						background: "rgba(0,0,0,0.75)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexDirection: "row",
						zIndex: 10,
						color: "#fff",
						paddingInline: "20px",
						paddingBlock: "10px",
						gap: "20px"
					}}
				>
					<p style={{ marginBottom: "0px" }}>
						Continue watching from <b>{formatTime(savedTime)}</b>?
					</p>

					<button
						onClick={handleResume}
						style={{
							background: "transparent",
							border: "1px solid var(--primary-color)",
							borderRadius: "8px",
						}}
					>
						Continue
					</button>
				</div>
			)}

			<ReactPlayer
				ref={playerRef}
				playing={isPlaying}
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				width="100%"
				height="100%"
				url={video_url}
				controls
				progressInterval={500}
				onProgress={handleProgress}
				onEnded={handleEnded}
				config={{
					file: {
						tracks: tracks,
						attributes: {
							crossOrigin: "anonymous"
						}
					}
				}}
			/>
		</div>
	);
};

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