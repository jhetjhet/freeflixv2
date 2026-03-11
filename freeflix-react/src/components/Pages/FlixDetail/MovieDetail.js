import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {useHistory, useParams} from 'react-router-dom';
import { Button } from 'react-bootstrap';
import {MoviePlayer} from './FlixPlayer.js';
import TMDBDetails from './TMDBDetails.js';
import { useAuth } from '../../../contexts/AuthContext';
import SimpleToast from '../../toast/SimpleToast';

const MovieDetail = () => {
	const [tmdb, setTmdb] = useState({});
	const {tmdb_id} = useParams();
	const history = useHistory();
	const [flix, setFlix] = useState({});
	const [inviteLink, setInviteLink] = useState('');
	const [inviteLoading, setInviteLoading] = useState(false);
	const [toast, setToast] = useState({ show: false, type: 'info', message: '' });
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		const conf = {
			params: {
				api_key: process.env.REACT_APP_TMDB_API_KEY,
				append_to_response: 'credits,images,reviews',
			}
		};
		axios.get(`https://api.themoviedb.org/3/movie/${tmdb_id}`, conf).then(resp => {
			setTmdb(resp.data);
		}).catch(err => {console.error(err.message)});
	}, [tmdb_id]);

	useEffect(() => {
		axios.get(`/api/movie/${tmdb_id}/`).then(resp => {
			setFlix(resp.data);
		}).catch(err => {
			console.error(err.message);
		});
	}, [tmdb_id]);

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

	return(
		<div>
			<SimpleToast
				show={toast.show}
				type={toast.type}
				message={toast.message}
				onClose={() => setToast({ show: false, type: 'info', message: '' })}
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