import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CreditsHolder from './CreditsHolder.js';
import TMDBDetails from './TMDBDetails.js';
import {
	Button,
	Accordion,
	Card,
} from 'react-bootstrap';
import { MoviePlayer } from './FlixPlayer.js';
import { useTMDB } from '../../../contexts/TMDBContext';
import { useFlix } from '../../../contexts/FlixContext';
import NotFound from '../NotFound.js';
import TMDBDetailsSkeleton from './TMDBDetailsSkeleton.js';
import DetailsToggleButton from './DetailsToggleButton.js';

const SeriesDetail = () => {
	const { flix_id, tmdb_id } = useParams();
	const [selectedSeason, setSelectedSeason] = useState(null);
	const [selectedEpisode, setSelectedEpisode] = useState(null);
	const [notFound, setNotFound] = useState(false);
	const { tmdb, load: loadTMDB, isLoading: isTMDBLoading } = useTMDB();
	const { flix, load: loadFlix, isLoading: isFlixLoading } = useFlix();

	useEffect(() => {
		setNotFound(false);

		loadFlix(tmdb_id, 'series', ({ success }) => {
			if (!success) setNotFound(true);
			else loadTMDB(tmdb_id, 'tv');
		});
	}, [tmdb_id, loadTMDB, loadFlix]);

	if (notFound) return <NotFound />;

	return (
		<div>

			{(isTMDBLoading || isFlixLoading) && <TMDBDetailsSkeleton />}

			{(!isTMDBLoading && tmdb) && (
				<DetailsToggleButton>
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
				</DetailsToggleButton>
			)}

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