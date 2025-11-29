import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {useParams} from 'react-router-dom';
import {MoviePlayer} from './FlixPlayer.js';
import TMDBDetails from './TMDBDetails.js';

const MovieDetail = () => {
	const [tmdb, setTmdb] = useState({});
	const {tmdb_id} = useParams();
	const [flix, setFlix] = useState({});

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
	}, []);

	useEffect(() => {
		axios.get(`/api/movie/${tmdb_id}/`).then(resp => {
			setFlix(resp.data);
		}).catch(err => {
			console.error(err.message);
		});
	}, [tmdb_id]);

	return(
		<div>
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
			{(flix?.video_path_exists) &&
			<div className="P-4">
				<div className="col-12">
					<MoviePlayer video_url={flix.video_url} subtitles={flix?.subtitles ?? []} />
				</div>
			</div>}
		</div>
	);
}

export default MovieDetail;