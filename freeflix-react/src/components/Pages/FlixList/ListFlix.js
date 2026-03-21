import React, { useState, useEffect, memo, useMemo } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard.js';
import MovieCardSkeleton from './MovieCardSkeleton.js';

const MovieCardsPlaceholder = memo(({ count = 12 }) => {
	return Array.from({ length: count }, (v, i) => i).map((index) => (
		<div key={index} className="col-lg-3 col-md-4 col-sm-6 col-xs-12 d-flex justify-content-center align-items-center mb-2">
			<MovieCardSkeleton />
		</div>
	));
});

const ListFlix = ({
	page = 1,
	searchFilter,
	flixTypeFilter,
	genreFilter,
	orderingFilter,
	videoExistsFilter = 'all',
	onResponse = () => { },
}) => {
	const [flixes, setFlixes] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	const flixItems = useMemo(() => {
		return flixes.map((flix) => {
			const isSeries = Boolean(flix.seasons);
			let videoCount = 0;
			
			if (isSeries) {
				videoCount = flix.seasons.reduce((count, season) => {
					return count + season.episodes.filter(episode => episode.has_video).length;
				}, 0);
			}
			else {
				videoCount = flix.has_video ? 1 : 0;
			}

			return {
				flix_id: flix.id,
				tmdb_id: flix.tmdb_id,
				title: flix.title,
				yearRelease: flix.date_release,
				posterURL: `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${flix.poster_path}`,
				genres: flix.genres.map(genre => genre.name),
				isSeries,
				videoCount,
			};
		});
	}, [flixes]);

	useEffect(() => {
		setIsLoading(true);

		var conf = { params: {} };
		const ordering = orderingFilter;

		if (searchFilter) {
			conf.params.search = searchFilter;
		}

		conf.params.page = page;
		conf.params.ordering = ordering;

		if (genreFilter !== 'all')
			conf.params.genre = genreFilter;

		if (videoExistsFilter === 0 || videoExistsFilter === 1)
			conf.params.video_exists = videoExistsFilter;

		const url = `/api/${flixTypeFilter.toLowerCase()}/`;
		axios.get(url, conf).then(resp => {
			setFlixes(resp.data.results);
			onResponse(resp.data);
		}).catch(err => {
			console.error(err);
		}).finally(() => {
			setIsLoading(false);
		});
	}, [page, searchFilter, flixTypeFilter, genreFilter, orderingFilter, videoExistsFilter]);

	return (
		<div className="h-100 d-flex justify-content-center">
			<div className="w-75">
				<div className="container">
					<div className="row">
						{flixes.length === 0 && !isLoading && (
							<div className="col-12 d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
								<h4 className="text-muted">No results found.</h4>
							</div>
						)}

						{isLoading && (
							<MovieCardsPlaceholder count={12} />
						)}

						{!isLoading && flixItems.length > 0 && (
							flixItems.map((flix) => (
								<div key={flix.flix_id} className="col-lg-3 col-md-4 col-sm-6 col-xs-12 d-flex justify-content-center align-items-center mb-2">
									<MovieCard {...flix} />
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}


export default ListFlix;