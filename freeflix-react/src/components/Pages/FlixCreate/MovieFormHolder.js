import React from 'react';
import FlixForm from './FlixForm.js';
import { useTMDB } from '../../../contexts/TMDBContext';
import { useFlix } from '../../../contexts/FlixContext';

const MovieFormHolder = () => {
	const { tmdb } = useTMDB();
	const { flix, load: loadFlix } = useFlix();

	if (!tmdb) return null;

	return (
		<div className="movie-form-holder p-2 my-2 rounded">
			<div className="d-flex">
				<h6 className="text-flix">{tmdb.title}</h6>
			</div>
			<div>
				<FlixForm
					tmdb={tmdb}
					flix={flix}
					flixType="movie"
					onFlixChange={() => loadFlix(tmdb.id, 'movie')}
				/>
			</div>
		</div>
	);
};

export default MovieFormHolder;