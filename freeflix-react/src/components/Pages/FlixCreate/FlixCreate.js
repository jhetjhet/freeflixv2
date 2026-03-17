import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TMDBPicker from './TMDB/TMDBPicker.js';
import SeriesFormHolder from './SeriesFormHolder.js';
import MovieFormHolder from './MovieFormHolder.js';
import { useTMDB } from '../../../contexts/TMDBContext';
import { useFlix } from '../../../contexts/FlixContext';

const parsePage = (raw) => {
	const n = Number.parseInt(raw, 10);
	return Number.isNaN(n) || n < 1 ? 1 : n;
};

const FlixCreate = () => {
	const history = useHistory();
	const location = useLocation();
	const { tmdb, load: loadTMDB, clear: clearTMDB } = useTMDB();
	const { load: loadFlix, clear: clearFlix } = useFlix();

	const queryParams = new URLSearchParams(location.search);
	const flixType = ['movie', 'tv'].includes(queryParams.get('type'))
		? queryParams.get('type')
		: 'movie';
	const title = queryParams.get('title') || '';
	const page = parsePage(queryParams.get('page'));

	const updateQueryParams = (updates) => {
		const nextParams = new URLSearchParams(location.search);
		Object.entries(updates).forEach(([key, value]) => {
			if (value === '' || value === null || value === undefined) {
				nextParams.delete(key);
			} else {
				nextParams.set(key, String(value));
			}
		});
		const nextSearch = nextParams.toString();
		const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
		const currentUrl = `${location.pathname}${location.search}`;
		if (nextUrl !== currentUrl) {
			history.push(nextUrl);
		}
	};

	const handleTMDBSelect = (selected) => {
		loadTMDB(selected.id, selected.flix_type);
		loadFlix(selected.id, selected.flix_type === 'movie' ? 'movie' : 'series');
	};

	const handleTypeChange = (updates) => {
		clearTMDB();
		clearFlix();
		updateQueryParams(updates);
	};

	let tmdbForm = null;
	if (tmdb) {
		if (flixType === 'movie') {
			tmdbForm = <MovieFormHolder key={tmdb.id} />;
		} else {
			tmdbForm = <SeriesFormHolder key={tmdb.id} />;
		}
	}

	return(
		<div className="mt-3">
			<div className="container">
				<div className="row">
					<div className="col">
						{tmdbForm}
					</div>
				</div>
				<div className="row">
					<div className="col">
						<div className="">
							<label>
								<input 
									type="radio" 
									value="movie" 
									checked={"movie" === flixType}
									onChange={() => handleTypeChange({ type: null, title: null, page: null })}  
								/>
								{' '}movie							
							</label>
							{' '}
							<label>
								<input 
									type="radio" 
									value="tv" 
									checked={"tv" === flixType}
									onChange={() => handleTypeChange({ type: 'tv', title: null, page: null })}  
								/>
								{' '}series							
							</label>
						</div>

						<TMDBPicker 
							flixType={flixType}
							title={title}
							page={page}
							onParamsChange={updateQueryParams}
							onTMDBSelect={handleTMDBSelect}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default FlixCreate;