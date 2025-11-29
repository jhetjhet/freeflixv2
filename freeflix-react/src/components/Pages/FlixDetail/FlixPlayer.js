import React, { useMemo } from 'react';
import ReactPlayer from 'react-player'

const VideoPlayer = ({ video_url, subtitles = [] }) => {

	const tracks = useMemo(() => subtitles.map(sub => ({
		kind: 'subtitles',
		src: sub.subtitle_url,
		label: sub.name,
		srcLang: sub.srclng,
		default: sub.is_default,
	})), [subtitles]);

	console.log("tracks", tracks)

	return (
		<div className="videoplayer">
			<ReactPlayer
				width="100%"
				height="100%"
				url={video_url}
				controls={true}
				config={{
					attributes: {
						crossOrigin: true,
					},
					file: {
						tracks: tracks,
					},
				}}
			/>
		</div>
	);
}

export const MoviePlayer = ({ video_url = "", subtitles = [] }) => {
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
					<VideoPlayer video_url={`${window.location.origin}/${video_url}`} subtitles={subtitles} />
				) : (
					<div style={{ minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<p>No video available.</p>
					</div>
				)}
			</div>
		</div>
	);
}