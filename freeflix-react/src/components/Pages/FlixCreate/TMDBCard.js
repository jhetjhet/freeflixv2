import React from 'react';
import PropTypes from 'prop-types';
import {
	Button,
} from 'react-bootstrap';

class TMDBCard extends React.Component{

	render(){
		const {tmdb, onTMDBSelect} = this.props;

		return (
			<div className="tmdb-result-item rounded d-flex flex-column">
				<div className="d-flex h-100 p-1">
					{tmdb.poster_path && 
						<div className="h-100">
							<img className="h-100" src={"https://image.tmdb.org/t/p/w600_and_h900_bestv2"+tmdb.poster_path} alt={"Poster of: "+tmdb.title} />
						</div>
					}
					<div className="w-100 d-flex flex-column ml-2">
						<span className="text-light md-text">{tmdb.title || tmdb.name}</span>
						<span className="text-light sm-text border-bottom">{tmdb.release_date || tmdb.first_air_date}</span>
						<div className="tmdb-item-overview md-text">
							<p className="text-light">{tmdb.overview}</p>
						</div>
						<div className="mt-auto float-right ml-auto">
							<Button variant="success" size="sm" onClick={onTMDBSelect.bind(this, tmdb)}>
								open
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}


TMDBCard.propTypes = {
	tmdb: PropTypes.object.isRequired,
}

export default TMDBCard;