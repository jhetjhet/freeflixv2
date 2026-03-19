import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { WatchTogetherPlayer } from '../FlixDetail/FlixPlayer';
import TMDBDetails from '../FlixDetail/TMDBDetails';
import DetailsToggleButton from '../FlixDetail/DetailsToggleButton';
import NotFound from '../NotFound';
import SimpleToast from '../../toast/SimpleToast';

const WatchTogetherControls = ({ room, userCount, onCopyRoomUrl }) => (
	<div className="container mt-3">
		<div style={{
			display: 'flex',
			alignItems: 'center',
			flexWrap: 'wrap',
			gap: '0.5rem 1rem',
			background: 'rgba(0,0,0,0.4)',
			border: '1px solid rgba(229,9,20,0.2)',
			borderLeft: '3px solid var(--primary-color)',
			borderRadius: '6px',
			padding: '0.6rem 1rem',
		}}>
			{/* Room ID */}
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
				<span style={{ color: '#666', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Room</span>
				<code style={{
					fontSize: '0.7rem',
					background: 'rgba(255,255,255,0.06)',
					border: '1px solid rgba(255,255,255,0.1)',
					borderRadius: '4px',
					padding: '1px 7px',
					color: '#d0d0d0',
					letterSpacing: '0.04em',
				}}>
					{room.roomId}
				</code>
			</div>

			<span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '1.1rem', lineHeight: 1 }}>|</span>

			{/* Role badge */}
			<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
				<span style={{ color: '#666', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Role</span>
				<span style={{
					fontSize: '0.65rem',
					fontWeight: 600,
					padding: '2px 9px',
					borderRadius: '999px',
					background: room.isHost ? 'rgba(229,9,20,0.15)' : 'rgba(255,255,255,0.06)',
					border: `1px solid ${room.isHost ? 'rgba(229,9,20,0.5)' : 'rgba(255,255,255,0.13)'}`,
					color: room.isHost ? '#ff6060' : '#999',
					textTransform: 'uppercase',
					letterSpacing: '0.04em',
				}}>
					{room.isHost ? 'Host' : 'Viewer'}
				</span>
			</div>

			{/* Live user count */}
			{userCount !== null && (
				<>
					<span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '1.1rem', lineHeight: 1 }}>|</span>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
						<span style={{
							display: 'inline-block',
							width: '6px',
							height: '6px',
							borderRadius: '50%',
							background: '#4ade80',
							boxShadow: '0 0 5px #4ade80',
							flexShrink: 0,
						}} />
						<span style={{ color: '#d0d0d0', fontSize: '0.7rem', fontWeight: 500 }}>
							{userCount} watching
						</span>
					</div>
				</>
			)}

			{/* Share / copy button */}
			{room.isHost && (
				<button
					type="button"
					onClick={onCopyRoomUrl}
					onMouseEnter={e => {
						e.currentTarget.style.background = 'rgba(229,9,20,0.28)';
						e.currentTarget.style.borderColor = 'rgba(229,9,20,0.7)';
					}}
					onMouseLeave={e => {
						e.currentTarget.style.background = 'rgba(229,9,20,0.1)';
						e.currentTarget.style.borderColor = 'rgba(229,9,20,0.4)';
					}}
					style={{
						marginLeft: 'auto',
						display: 'flex',
						alignItems: 'center',
						gap: '0.35rem',
						background: 'rgba(229,9,20,0.1)',
						border: '1px solid rgba(229,9,20,0.4)',
						borderRadius: '4px',
						color: '#f2f2f2',
						fontSize: '0.7rem',
						fontWeight: 500,
						padding: '5px 13px',
						cursor: 'pointer',
						transition: 'background 0.15s, border-color 0.15s',
						letterSpacing: '0.03em',
						flexShrink: 0,
					}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
						<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
						<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
					</svg>
					Share Room
				</button>
			)}
		</div>
	</div>
);

const WatchTogetherRoom = () => {
	const { roomId } = useParams();
	const { isAuthenticated, isLoading } = useAuth();
	const [room, setRoom] = useState(null);
	const [tmdb, setTmdb] = useState({});
	const [flix, setFlix] = useState({});
	const [notFound, setNotFound] = useState(false);
	const [roomLoading, setRoomLoading] = useState(true);
	const [userCount, setUserCount] = useState(null);
	const [detailsExpanded, setDetailsExpanded] = useState(true);
	const [toast, setToast] = useState({ show: false, type: 'error', message: '' });

	const handleCopyRoomUrl = async () => {
		const shareUrl = `${window.location.origin}/share/watch-together/${room.roomId}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setToast({ show: true, type: 'success', message: 'Room URL copied to clipboard.' });
		} catch (error) {
			setToast({ show: true, type: 'error', message: 'Failed to copy room URL.' });
		}
	};

	useEffect(() => {
		if (isLoading) {
			return;
		}

		if (!isAuthenticated) {
			setNotFound(true);
			setRoomLoading(false);
			return;
		}

		axios.get(`/node/watch-together/${roomId}/`).then((response) => {
			setRoom(response.data);
		}).catch(() => {
			setNotFound(true);
		}).finally(() => {
			setRoomLoading(false);
		});
	}, [isAuthenticated, isLoading, roomId]);

	useEffect(() => {
		if (!room?.movieId) {
			return;
		}

		const conf = {
			params: {
				api_key: process.env.REACT_APP_TMDB_API_KEY,
				append_to_response: 'credits,images,reviews',
			},
		};

		axios.get(`https://api.themoviedb.org/3/movie/${room.movieId}`, conf).then((response) => {
			setTmdb(response.data);
		}).catch((error) => {
			console.error(error.message);
		});

		axios.get(`/api/movie/${room.movieId}/`).then((response) => {
			setFlix(response.data);
		}).catch(() => {
			setNotFound(true);
		});
	}, [room]);

	if (notFound) {
		return <NotFound />;
	}

	if (isLoading || roomLoading || !room) {
		return (
			<div className="container py-5 text-center">
				<p className="md-text">Loading watch room...</p>
			</div>
		);
	}

	return (
		<div className="pb-5">
			<SimpleToast
				show={toast.show}
				type={toast.type}
				message={toast.message}
				onClose={() => setToast({ show: false, type: 'error', message: '' })}
			/>
			<div style={{ overflow: 'hidden', maxHeight: detailsExpanded ? '2500px' : '0', opacity: detailsExpanded ? 1 : 0, transition: 'max-height 0.4s ease, opacity 0.25s ease', pointerEvents: detailsExpanded ? 'auto' : 'none' }}>
				<TMDBDetails
					poster_path={tmdb.poster_path}
					title={tmdb.title}
					original_title={tmdb.original_title}
					release_date={tmdb.release_date}
					overview={tmdb.overview}
					genres={tmdb.genres}
					images_backdrops={tmdb?.images?.backdrops ?? []}
					credits={tmdb.credits}
					video_path={flix?.video_path_exists ? flix.video_path : null}
				/>
			</div>
			<DetailsToggleButton expanded={detailsExpanded} onToggle={() => setDetailsExpanded(v => !v)} />
			<WatchTogetherControls
				room={room}
				userCount={userCount}
				onCopyRoomUrl={handleCopyRoomUrl}
			/>

			<div className="my-4" />

			{flix?.video_path_exists ? (
				<WatchTogetherPlayer
					roomId={room.roomId}
					id={flix?.video_path}
					video_url={flix.video_url}
					subtitles={flix?.subtitles ?? []}
					isHost={room.isHost}
					syncInterval={room.syncInterval}
					onRoomClosed={() => setNotFound(true)}
					onError={(message) => setToast({ show: true, type: 'error', message })}
					onUserCountChange={setUserCount}
				/>
			) : (
				<div className="container py-4 text-center">
					<p className="md-text">This room is currently unavailable because the video could not be found.</p>
				</div>
			)}
		</div>
	);
};

export default WatchTogetherRoom;