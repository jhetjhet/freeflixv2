import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { MoviePlayer } from './FlixPlayer.js';
import TMDBDetails from './TMDBDetails.js';
import { useAuth } from '../../../contexts/AuthContext';
import { useTMDB } from '../../../contexts/TMDBContext';
import { useFlix } from '../../../contexts/FlixContext';
import SimpleToast from '../../toast/SimpleToast';
import axios from 'axios';
import FlixForm from '../FlixCreate/FlixForm.js';
import NotFound from '../NotFound.js';
import TMDBDetailsSkeleton from './TMDBDetailsSkeleton.js';

const MovieDetail = () => {
	const { tmdb_id } = useParams();
	const history = useHistory();
	const [inviteLink, setInviteLink] = useState('');
	const [inviteLoading, setInviteLoading] = useState(false);
	const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
	const [showForm, setShowForm] = useState(false);
	const [notFound, setNotFound] = useState(false);
	const { isAuthenticated, user } = useAuth();
	const canCreateFlix = Boolean(user?.can_create_flix);
	const { tmdb, load: loadTMDB, isLoading: isTMDBLoading } = useTMDB();
	const { flix, load: loadFlix, isLoading: isFlixLoading } = useFlix();

	useEffect(() => {
		setNotFound(false);

		loadFlix(tmdb_id, 'movie', ({ success }) => {
			if (!success) setNotFound(true);
			else loadTMDB(tmdb_id, 'movie');
		});
	}, [tmdb_id, loadTMDB, loadFlix]);

	const createInviteLink = async () => {
		setInviteLoading(true);

		try {
			const response = await axios.post(`/node/watch-together/create/${tmdb_id}/`);
			const nextInviteLink = `${window.location.origin}${response.data.invitePath}`;
			setInviteLink(nextInviteLink);

			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(nextInviteLink);
			}

			setToast({
				show: true,
				type: 'info',
				message: 'Watch Together invite link created and copied.',
			});

			history.push(response.data.invitePath);
		} catch (error) {
			setToast({
				show: true,
				type: 'error',
				message: error?.response?.data?.detail || 'Failed to create the watch room.',
			});
		} finally {
			setInviteLoading(false);
		}
	};

	if (notFound) return <NotFound />;

	return (
		<div>
			<SimpleToast
				show={toast.show}
				type={toast.type}
				message={toast.message}
				onClose={() => setToast({ show: false, type: 'info', message: '' })}
			/>

			{isAuthenticated && canCreateFlix && flix && (
				<div className="d-flex justify-content-end px-3 pt-3">
					<Button
						variant={showForm ? 'outline-secondary' : 'outline-light'}
						size="sm"
						onClick={() => setShowForm(prev => !prev)}
					>
						{showForm ? 'close' : 'edit'}
					</Button>
				</div>
			)}

			{showForm && flix && (
				<div className="my-4 d-flex justify-content-center">
					<div className="col-12 col-lg-6">
						<FlixForm
							tmdb={tmdb}
							flix={flix}
							flixType="movie"
							onFlixChange={() => loadFlix(tmdb_id, 'movie')}
							onDelete={() => history.push('/')}
						/>
					</div>
				</div>
			)}

			{(isTMDBLoading || isFlixLoading) && <TMDBDetailsSkeleton />}

			{(!isTMDBLoading && tmdb) && (
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
			)}

			{isAuthenticated && flix?.video_path_exists && (
				<div className="container mt-3">
					<div className="d-flex flex-column flex-md-row align-items-md-center">
						<Button disabled={inviteLoading} onClick={createInviteLink} variant="flix" size="sm">
							{inviteLoading ? 'creating...' : 'watch together'}
						</Button>
						{inviteLink && (
							<input
								className="ml-md-3 mt-2 mt-md-0 p-2 w-100"
								type="text"
								readOnly
								value={inviteLink}
								onFocus={(event) => event.target.select()}
							/>
						)}
					</div>
				</div>
			)}
			{(flix?.video_path_exists) &&
				<div className="P-4">
					<div className="col-12">
						<MoviePlayer id={flix?.video_path} video_url={flix.video_url} subtitles={flix?.subtitles ?? []} />
					</div>
				</div>}
		</div>
	);
}

export default MovieDetail;