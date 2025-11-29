import React, {useState} from 'react';
import TMDBPicker from './TMDB/TMDBPicker.js';
import SeriesFormHolder from './SeriesFormHolder.js';
import MovieFormHolder from './MovieFormHolder.js';

const FlixCreate = () => {
	const [flixType, setFlixType] = useState('movie');
	const [tmdb, setTMDB] = useState({});

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
									onChange={(e) => setFlixType(e.target.value)}  
								/>
								{' '}movie							
							</label>
							{' '}
							<label>
								<input 
									type="radio" 
									value="tv" 
									checked={"tv" === flixType}
									onChange={(e) => setFlixType(e.target.value)}  
								/>
								{' '}series							
							</label>
						</div>

						<TMDBPicker 
							flixType={flixType}
							onTMDBSelect={setTMDB}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default FlixCreate;