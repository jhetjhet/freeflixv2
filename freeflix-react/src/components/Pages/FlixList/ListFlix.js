import React, {useState, useEffect} from 'react';
import axios from 'axios';
import MovieCard from './MovieCard.js';

const ListFlix = ({searchFilter, flixTypeFilter, genreFilter, orderingFilter}) => {
	const [flixes, setFlixes] = useState([]);

	useEffect(() => {
		var conf = {params:{}};
		var ordering;
		switch(orderingFilter){
			case 'latest':
				ordering = 'date_upload';
				break;
			case 'oldest':
				ordering = '-date_upload';
				break;
			case 'year':
				ordering = 'date_release';
				break;
			default:
				ordering = orderingFilter;
				break;
		}

		conf.params.search = searchFilter;
		conf.params.ordering = ordering;

		if(genreFilter !== 'all')
			conf.params.genre = genreFilter;

		const url = `/api/${flixTypeFilter.toLowerCase()}/`;
		axios.get(url, conf).then(resp => {
			setFlixes(resp.data.results);
		}).catch(err => {
			console.error(err);
		});
	}, [searchFilter, flixTypeFilter, genreFilter, orderingFilter]);

	return (
		<div className="h-100 d-flex mt-3 justify-content-center">
			<div className="w-75 my-5">
				<div className="container">
					<div className="row">
						{flixes.map((flix) => (
							<div key={flix.id} className="col-lg-3 col-md-4 col-sm-6 col-xs-12 d-flex justify-content-center align-items-center mb-2">
								<MovieCard
									flix_id={flix.id}
									tmdb_id={flix.tmdb_id}
									title={flix.title}
									yearRelease={flix.date_release}
									posterURL={`https://image.tmdb.org/t/p/w600_and_h900_bestv2/${flix.poster_path}`}
									genres={flix.genres.map(genre => genre.name)}
									isSeries={Boolean(flix.seasons)}
								/>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}


export default ListFlix;