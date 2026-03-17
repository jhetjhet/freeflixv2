import React, { useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import FlixForm from './FlixForm.js';
import {
	Button,
	Accordion,
	Card,
} from 'react-bootstrap';
import { useTMDB } from '../../../contexts/TMDBContext';
import { useFlix } from '../../../contexts/FlixContext';

const mapSeasonsToEpisodes = (seasons = []) =>
	seasons.reduce((acc, season) => {
		acc[season.season_number] = (season.episodes || []).reduce((epAcc, episode) => {
			epAcc[episode.episode_number] = episode;
			return epAcc;
		}, {});
		return acc;
	}, {});

const SeriesFormHolder = () => {
	const { tmdb: tmdbSeries } = useTMDB();
	const { flix: flixSeries, isLoading: flixReqIsLoading, load: loadFlix } = useFlix();
	const [selectedSeason, setSelectedSeason] = useState(null);
	const [tmdbEpisode, setTmdbEpisode] = useState(null);

	const flixSeasonMaps = useMemo(
		() => mapSeasonsToEpisodes(flixSeries?.seasons),
		[flixSeries]
	);

	const reloadFlix = useCallback(() => {
		if (tmdbSeries?.id) loadFlix(tmdbSeries.id, 'series');
	}, [tmdbSeries, loadFlix]);

	const loadSeries = () => {
		const { id, name, genres, first_air_date, poster_path } = tmdbSeries ?? {};
		const data = {
			title: name,
			tmdb_id: id,
			genres: (genres || []).map(g => ({ tmdb_id: g.id, name: g.name })),
			date_release: first_air_date,
			poster_path,
		};
		axios.post('/api/series/', data, { headers: { 'Content-Type': 'application/json' } })
			.then(() => reloadFlix())
			.catch(err => console.error(err.message));
	};

	const loadSeason = (season) => {
		const data = {
			title: season.name,
			season_number: season.season_number,
			tmdb_id: season.id,
		};
		axios.post(`/api/series/${tmdbSeries.id}/season/`, data)
			.then(() => reloadFlix())
			.catch(err => console.error(err.message));
	};

	const loadTmdbEpisode = (tmdbId, seasonNumber, episodeNumber) => {
		const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`;
		axios.get(url, { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } })
			.then(resp => setTmdbEpisode(resp.data))
			.catch(err => console.error(err.message));
	};

	const episodeFlix = tmdbEpisode
		? flixSeasonMaps?.[selectedSeason?.season_number]?.[tmdbEpisode.episode_number] ?? null
		: null;

	return (
		<div className="series-form-holder w-100 rounded my-2 p-4 mb-4">
			{tmdbEpisode && (
				<FlixForm
					key={tmdbEpisode.id}
					seriesID={tmdbSeries?.id}
					tmdb={tmdbEpisode}
					flix={episodeFlix}
					flixType="episode"
					onFlixChange={reloadFlix}
				/>
			)}
			<div className="p-1 d-flex mb-2">
				<span>{tmdbSeries?.name}</span>
				<div className="ml-auto">
					{!flixReqIsLoading && !flixSeries && (
						<Button variant="success" size="sm" className="py-0 px-1" onClick={loadSeries}>
							load
						</Button>
					)}
				</div>
			</div>
			<Accordion className="mb-2">
				{tmdbSeries?.seasons?.map((season) => (
					<Card key={season.id}>
						<Card.Header className="d-flex align-items-center p-1">
							<Accordion.Toggle
								disabled={!flixSeasonMaps?.[season.season_number]}
								as={Button}
								variant="link"
								eventKey={season.id}
							>
								{season.name} - {season.season_number}
							</Accordion.Toggle>
							{!flixSeasonMaps?.[season.season_number] && (
								<Button
									disabled={!flixSeries}
									variant="success"
									size="sm"
									className="ml-3 py-0 px-1"
									onClick={() => loadSeason(season)}
								>
									load
								</Button>
							)}
						</Card.Header>
						<Accordion.Collapse eventKey={season.id}>
							<Card.Body className="p-4 d-flex flex-wrap">
								{[...Array(season.episode_count).keys()].map((num) => (
									<Button
										key={num + 1}
										variant={flixSeasonMaps?.[season.season_number]?.[num + 1] ? 'primary' : 'secondary'}
										size="sm"
										className="m-1"
										onClick={() => {
											setSelectedSeason(season);
											loadTmdbEpisode(tmdbSeries.id, season.season_number, num + 1);
										}}
									>
										Episode {num + 1}
									</Button>
								))}
							</Card.Body>
						</Accordion.Collapse>
					</Card>
				))}
			</Accordion>
		</div>
	);
};

export default SeriesFormHolder;
