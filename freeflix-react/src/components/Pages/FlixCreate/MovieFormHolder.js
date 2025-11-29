import React from 'react';
import PropTypes from 'prop-types';
import FlixForm from './FlixForm.js';
import axios from 'axios';

class MovieFormHolder extends React.Component{

	constructor(props){
		super(props);

		this.state = {
			tmdbMovieType: null,
		}
	}

	componentDidMount(){
		const {tmdb} = this.props;
		const conf = {params: {api_key: process.env.REACT_APP_TMDB_API_KEY}};
		axios.get(`https://api.themoviedb.org/3/movie/${tmdb.id}`, conf).then(resp => {
			this.setState({tmdbMovieType: resp.data});
		}).catch(err => {console.error(err.message)});
	}

	render(){
		const {tmdbMovieType} = this.state;
		const {tmdb} = this.props;

		return (
			<div className="movie-form-holder p-2 my-2 rounded">
				<div className="d-flex">
					<h6 className="text-flix">{tmdb.title}</h6>
				</div>
				<div>
					{tmdbMovieType &&
					<FlixForm tmdb={tmdbMovieType} flixType={"movie"} />}
				</div>
			</div>
		);
	}
}

MovieFormHolder.propTypes = {
	tmdb: PropTypes.object.isRequired,
}

export default MovieFormHolder;