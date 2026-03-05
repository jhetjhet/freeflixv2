import React from 'react';
import { Card } from 'react-bootstrap';

const MovieCardSkeleton = () => {
	return (
		<Card
			style={{
				maxWidth: '180px',
				minHeight: '295px',
			}}
			className="w-100 overflow-hidden m-1"
		>
			<Card.Body className="p-0">
				<div className="movie-card-poster">
					<div className="rounded movie-card-poster-cont">
						<div className="skeleton-box w-100" style={{ height: '230px' }}></div>
					</div>
				</div>

				<Card.Text className="d-flex flex-column p-2">
					<div className="skeleton-box mb-2 rounded" style={{ height: '14px', width: '85%' }}></div>
					<div className="skeleton-box rounded" style={{ height: '12px', width: '45%' }}></div>
				</Card.Text>
			</Card.Body>
		</Card>
	);
};

export default MovieCardSkeleton;