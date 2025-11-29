import React from 'react';
import {Card} from 'react-bootstrap';
import {Link} from 'react-router-dom';

const MovieCard = ({ flix_id, tmdb_id, title, yearRelease, posterURL, genres, isSeries }) => {

	return (
		<Link to={`flix/${isSeries ? 'series' : 'movie'}/${flix_id}/${tmdb_id}`}>
			<Card style={{maxWidth: '180px'}} className="movie-card overflow-hidden m-1">
				<Card.Body className="p-0">
					<div className="movie-card-poster">
						<div className="rounded movie-card-poster-cont">
							<img className="w-100" src={posterURL} alt='{title} poster'/>
							<div className="movie-card-overlay">
								<div className="d-flex flex-column justify-content-between">
									<div className="d-flex flex-column align-items-center justify-content-center">
										<svg width="1em" height="1em" viewBox="0 0 16 16" className="bi bi-star-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
											<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.283.95l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
										</svg>
									</div>
									<div className="d-flex flex-column align-items-center justify-content-center">
										{genres.map(genre => (
											<span key={genre} className="movie-card-genre">{genre}</span>
										))}
									</div>
									<div className="d-flex align-items-center justify-content-center">
										<span className="movie-card-view-btn rounded">view details</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					<Card.Text className="d-flex flex-column">
						<span className="movie-card-title">
							{title}
							({isSeries ? 'series' : 'movie'})
						</span>
						<span className="movie-card-year">{yearRelease}</span>
					</Card.Text>
				</Card.Body>
			</Card>
		</Link>
	);
}

export default MovieCard;