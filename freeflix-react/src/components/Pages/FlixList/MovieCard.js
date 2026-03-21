import React from 'react';
import {Card} from 'react-bootstrap';
import {Link} from 'react-router-dom';

const MovieCard = ({ 
	flix_id, 
	tmdb_id, 
	videoCount = 0,
	title, 
	yearRelease, 
	posterURL, 
	genres, 
	isSeries 
}) => {

	return (
		<Link to={`flix/${isSeries ? 'series' : 'movie'}/${flix_id}/${tmdb_id}`}>
			<Card style={{maxWidth: '180px'}} className="movie-card overflow-hidden m-1">
				<Card.Body className="p-0">
					<div className="movie-card-poster">
						<div className="rounded movie-card-poster-cont">
							<img className="w-100" src={posterURL} alt='{title} poster'/>						{videoCount > 0 && (
							<div className="movie-card-video-badge">
								{isSeries ? (
									<>
										<svg width="0.75em" height="0.75em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
											<path d="M14 2H2C0 2 0 4 0 4v6c0 2 2 2 2 2h12c2 0 2-2 2-2V4c0-2-2-2-2-2zm0 9H2V4h12v7zM3 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm8-2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
											<path d="M2.5 13.5A.5.5 0 0 1 3 13h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
										</svg>
										<span>{videoCount}</span>
									</>
								) : (
									<svg width="0.75em" height="0.75em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
										<path d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1zm4 0v6h8V1H4zm8 8H4v6h8V9zM1 1v2h2V1H1zm2 3H1v2h2V4zM1 7v2h2V7H1zm2 3H1v2h2v-2zm-2 3v2h2v-2H1zM15 1h-2v2h2V1zm-2 3v2h2V4h-2zm2 3h-2v2h2V7zm-2 3v2h2v-2h-2zm2 3h-2v2h2v-2z"/>
									</svg>
								)}
							</div>
						)}							<div className="movie-card-overlay">
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