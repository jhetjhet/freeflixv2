import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { WatchTogetherPlayer } from '../FlixDetail/FlixPlayer';
import TMDBDetails from '../FlixDetail/TMDBDetails';
import NotFound from '../NotFound';
import SimpleToast from '../../toast/SimpleToast';

const WatchTogetherRoom = () => {
	const { roomId } = useParams();
	const { isAuthenticated, isLoading } = useAuth();
	const [room, setRoom] = useState(null);
	const [tmdb, setTmdb] = useState({});
	const [flix, setFlix] = useState({});
	const [notFound, setNotFound] = useState(false);
	const [roomLoading, setRoomLoading] = useState(true);
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
			<div className="container mt-3">
				<p className="md-text">Room: {room.roomId}</p>
				<p className="md-text">Role: {room.isHost ? 'Host' : 'Participant'}</p>
				{room.isHost && (
					<button
						type="button"
						className="btn btn-outline-light mt-2"
						onClick={handleCopyRoomUrl}
					>
						Copy room URL
					</button>
				)}
			</div>
			{flix?.video_path_exists ? (
				<div className="d-flex flex-column align-items-center justify-content-center">
					<div className="col-12 col-md-10 col-lg-8">
						<WatchTogetherPlayer
							roomId={room.roomId}
							id={flix?.video_path}
							video_url={flix.video_url}
							subtitles={flix?.subtitles ?? []}
							isHost={room.isHost}
							syncInterval={room.syncInterval}
							onRoomClosed={() => setNotFound(true)}
							onError={(message) => setToast({ show: true, type: 'error', message })}
						/>
					</div>
				</div>
			) : (
				<div className="container py-4 text-center">
					<p className="md-text">This room is currently unavailable because the video could not be found.</p>
				</div>
			)}
		</div>
	);
};

export default WatchTogetherRoom;