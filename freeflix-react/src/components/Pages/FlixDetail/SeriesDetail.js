import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CreditsHolder from './CreditsHolder.js';
import TMDBDetails from './TMDBDetails.js';
import {
	Button,
	Accordion,
	Card,
} from 'react-bootstrap';
import { MoviePlayer } from './FlixPlayer.js';

const SeriesDetail = () => {
	const [tmdb, setTmdb] = useState({});
	const { flix_id, tmdb_id } = useParams();
	const [flix, setFlix] = useState({});
	const [selectedSeason, setSelectedSeason] = useState(null);
	const [selectedEpisode, setSelectedEpisode] = useState(null);

	useEffect(() => {
		const conf = {
			params: {
				api_key: process.env.REACT_APP_TMDB_API_KEY,
				append_to_response: 'credits,images,reviews',
			}
		};
		axios.get(`https://api.themoviedb.org/3/tv/${tmdb_id}`, conf).then(resp => {
			setTmdb(resp.data);
		}).catch(err => { console.error(err.message) });
	}, [tmdb_id]);

	useEffect(() => {
		axios.get(`/api/series/${tmdb_id}/`).then(resp => {
			setFlix(resp.data);
		}).catch(err => {
			console.error(err.message);
		});
	}, [tmdb_id]);

	return (
		<div>
			<TMDBDetails 
				poster_path={tmdb.poster_path}
				title={tmdb.name}
				original_title={tmdb.original_name}
				release_date={tmdb.first_air_date}
				overview={tmdb.overview}
				genres={tmdb.genres}
				images_backdrops={tmdb?.images?.backdrops ?? []}
				credits={tmdb.credits}
				video_path={flix?.video_path_exists ? flix.video_path : null} 
			/>
			<div>
				{(selectedSeason && selectedEpisode) && (
					<div className="P-4 pt-4">
						<h3 className="text-center">
							{selectedSeason.title} / {selectedEpisode.title}
						</h3>
					</div>
				)}
				{selectedEpisode?.video_path_exists && (
					<MoviePlayer video_url={selectedEpisode?.video_url} subtitles={selectedEpisode?.subtitles ?? []} />
				)}
			</div>
			{flix && (
				<Accordion className="mt-3 mb-5">
					{flix?.seasons?.map((season) => (
						<Card key={season?.tmdb_id} className="p-0">
							<Card.Header>
								<Accordion.Toggle as={Button} variant="link" eventKey={season?.tmdb_id}>
									{season?.title}-{season?.season_number}
								</Accordion.Toggle>
							</Card.Header>
							<Accordion.Collapse eventKey={season?.tmdb_id}>
								<Card.Body className="p-4 d-flex">
									{season?.episodes?.map((episode) => (
										<Button
											disabled={!episode?.video_path_exists}
											key={episode?.tmdb_id}
											variant={selectedEpisode?.tmdb_id === episode?.tmdb_id ? "primary" : "secondary"}
											className="mx-2 my-1 px-2"
											onClick={() => {
												setSelectedEpisode(episode);
												setSelectedSeason(season);
											}}
										>
											{episode?.title}
										</Button>
									))}
								</Card.Body>
							</Accordion.Collapse>
						</Card>
					))}
				</Accordion>
			)}
		</div>
	);
}

export default SeriesDetail;