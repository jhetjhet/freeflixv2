import React, {useState} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TMDBPicker from './TMDB/TMDBPicker.js';
import SeriesFormHolder from './SeriesFormHolder.js';
import MovieFormHolder from './MovieFormHolder.js';

const parsePage = (raw) => {
	const n = Number.parseInt(raw, 10);
	return Number.isNaN(n) || n < 1 ? 1 : n;
};

const FlixCreate = () => {
	const history = useHistory();
	const location = useLocation();
	const [tmdb, setTMDB] = useState({});

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

	var tmdbForm;
	if(Object.keys(tmdb).length > 0){
		if(tmdb.flix_type === 'movie')
			tmdbForm = (
				<MovieFormHolder 
					key={tmdb.id}
					tmdb={tmdb}
				/>
			)
		else
			tmdbForm = (
				<SeriesFormHolder 
					key={tmdb.id}
					tmdb={tmdb}	
				/>
			)
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
									onChange={() => updateQueryParams({ type: null, title: null, page: null })}  
								/>
								{' '}movie							
							</label>
							{' '}
							<label>
								<input 
									type="radio" 
									value="tv" 
									checked={"tv" === flixType}
									onChange={() => updateQueryParams({ type: 'tv', title: null, page: null })}  
								/>
								{' '}series							
							</label>
						</div>

						<TMDBPicker 
							flixType={flixType}
							title={title}
							page={page}
							onParamsChange={updateQueryParams}
							onTMDBSelect={setTMDB}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default FlixCreate;