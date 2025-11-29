import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import FlixForm from './FlixForm.js';
import {
	Button,
	Accordion,
	Card,
} from 'react-bootstrap';
import AccordionContext from 'react-bootstrap/AccordionContext';
import { useAccordionToggle } from 'react-bootstrap/AccordionToggle';

class SeriesFormHolder extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			tmdbSeriesType: null,
			tmdbSeries: null,
			flixSeries: null,
			flixSeasonMaps: {},
			flixReqIsLoading: true,
			selectedSeason: null,
			tmdbEpisode: null,
		}
	}

	mapSeasonsToEpisodes(seasons) {
		return seasons.reduce((acc, season) => {
			acc[season.season_number] = season.episodes.reduce((epAcc, episode) => {
				epAcc[episode.episode_number] = episode;
				return epAcc;
			}, {});
			return acc;
		}, {});
	}

	componentDidMount() {
		const conf = { params: { api_key: process.env.REACT_APP_TMDB_API_KEY } };
		var tvReq = axios.get(`https://api.themoviedb.org/3/tv/${this.props.tmdb.id}`, conf);
		var tvFlixReq = axios.get(`/api/series/${this.props.tmdb.id}/`).catch(err => {
			console.error(err.message);
		});

		this.setState({ flixReqIsLoading: true });

		// Separate API calls for TMDB and Flix
		tvReq.then(tvResp => {
			const tmdbSeries = tvResp.data;
			this.setState({ tmdbSeries });

			// Now fetch Flix series
			tvFlixReq.then(tvFlixResp => {
				if (!tvFlixResp) {
					this.setState({ flixReqIsLoading: false });
					return;
				}
				const flixSeries = tvFlixResp.data;
				const flixSeasonMaps = this.mapSeasonsToEpisodes(flixSeries.seasons);

				console.log('>>>> ', flixSeasonMaps);

				this.setState({
					flixSeries: flixSeries,
					flixSeasonMaps: flixSeasonMaps,
				});
			}).catch(err => {
				console.error(err.message);
			}).finally(() => {
				this.setState({ flixReqIsLoading: false });
			});
		}).catch(err => {
			console.error(err.message);
		});
	}

	loadSeries() {
		const { id, name, genres, first_air_date, poster_path } = this.state?.tmdbSeries ?? {
			id: null,
			name: this.props.tmdb.name,
			genres: this.props.tmdb.genres || [],
			first_air_date: this.props.tmdb.first_air_date || null,
			poster_path: this.props.tmdb.poster_path || null,
		};
		const conf = { headers: { 'Content-Type': 'application/json' } };

		const data = {
			title: name,
			tmdb_id: id,
			genres: genres.map(g => ({ tmdb_id: g.id, name: g.name })),
			date_release: first_air_date,
			poster_path: poster_path,
		}

		axios.post('/api/series/', data, conf).then(resp => {
			this.setState({ flixSeries: resp.data });
		}).catch(err => {
			console.error(err.message);
		});
	}

	loadSeason(season) {
		const { id } = this.props.tmdb;
		const data = {
			title: season.name,
			season_number: season.season_number,
			tmdb_id: season.id
		};

		axios.post(`/api/series/${id}/season/`, data).then(resp => {
			let flixSeries = this.state.flixSeries;
			let newSeason = resp.data;

			if (!flixSeries.seasons) {
				flixSeries.seasons = [];
			}

			flixSeries.seasons.push(newSeason);
			this.setState(prevState => ({
				flixSeries: flixSeries,
				flixSeasonMaps: {
					...prevState.flixSeasonMaps,
					[newSeason.season_number]: {}
				}
			}));
		}).catch(err => {
			console.error(err.message);
		});
	}

	loadTmdbEpisode(tmdbId, seasonNumber, episodeNumber) {
		var tmdbEpisodeReqUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`;

		axios.get(tmdbEpisodeReqUrl, {
			params: { api_key: process.env.REACT_APP_TMDB_API_KEY }
		}).then(resp => {
			console.log(">>> ", resp.data);
			this.setState({ tmdbEpisode: resp.data });
		}).catch(err => {
			console.error(err.message);
		});
	}

	CustomToggle({ children, eventKey, className }) {
		const currentEventKey = React.useContext(AccordionContext);
		const toggle = useAccordionToggle(eventKey);
		const isOpen = currentEventKey === eventKey;
		const icon = isOpen ? (
			<svg width="1em" height="1em" viewBox="0 0 16 16" className="bi bi-arrow-up-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
				<path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
				<path fillRule="evenodd" d="M4.646 8.354a.5.5 0 0 0 .708 0L8 5.707l2.646 2.647a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 0 0 0 .708z" />
				<path fillRule="evenodd" d="M8 11.5a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-1 0v5a.5.5 0 0 0 .5.5z" />
			</svg>
		) : (
			<svg width="1em" height="1em" viewBox="0 0 16 16" className="bi bi-arrow-down-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
				<path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
				<path fillRule="evenodd" d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
				<path fillRule="evenodd" d="M8 4.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5z" />
			</svg>
		)
		return (
			<button onClick={toggle} className={"btn-none " + className}>
				{icon}
			</button>
		);
	}

	render() {
		const { tmdbSeries, selectedSeason, tmdbEpisode } = this.state;

		return (
			<div className="series-form-holder w-100 rounded my-2 p-4 mb-4">
				{(tmdbEpisode) && (
					<FlixForm 
						key={tmdbEpisode.id} 
						seriesID={tmdbSeries.id} 
						tmdb={tmdbEpisode} 
						flixType="episode"
						onSubmit={(episode) => {
							let flixSeries = {...this.state.flixSeries};
							let newSeason = {...selectedSeason};

							if (!flixSeries.seasons) {
								flixSeries.seasons = [];
							}

							const seasonIndex = flixSeries.seasons.findIndex(s => s.season_number === newSeason.season_number);
							if (seasonIndex !== -1) {
								flixSeries.seasons[seasonIndex].episodes = flixSeries.seasons[seasonIndex].episodes || [];
								flixSeries.seasons[seasonIndex].episodes.push(episode);
							} else {
								newSeason.episodes = [episode];
								flixSeries.seasons.push(newSeason);
							}

							this.setState({
								flixSeries: flixSeries,
								selectedSeason: newSeason,
								flixSeasonMaps: this.mapSeasonsToEpisodes(flixSeries.seasons),
							});
						}}
						onDelete={(episodeTmdbId) => {
							let flixSeries = {...this.state.flixSeries};
							let seasonIndex = this.state.flixSeries.seasons.findIndex(s => s.season_number === selectedSeason.season_number);
							
							if (seasonIndex !== -1) {
								flixSeries.seasons[seasonIndex].episodes = flixSeries.seasons[seasonIndex].episodes.filter(episode => episode.tmdb_id != episodeTmdbId);
							}

							this.setState({ 
								flixSeries: flixSeries,
								flixSeasonMaps: this.mapSeasonsToEpisodes(flixSeries.seasons),
							});
						}}
					/>
				)}
				<div className="p-1 d-flex mb-2">
					<span>{this.props.tmdb?.name}</span>
					<div className="ml-auto">
						{(!this.state.flixReqIsLoading && !this.state.flixSeries) && (
							<Button variant="success" size="sm" className="py-0 px-1" onClick={this.loadSeries.bind(this)}>
								load
							</Button>
						)}
					</div>
				</div>
				<Accordion className="mb-2">
					{this.state.tmdbSeries?.seasons?.map((season) => (
						<Card key={season.id}>
							<Card.Header className="d-flex align-items-center p-1">
								<Accordion.Toggle disabled={!this.state.flixSeasonMaps?.[season.season_number]} as={Button} variant="link" eventKey={season.id}>
									{season.name} - {season.season_number}
								</Accordion.Toggle>
								{(!this.state.flixSeasonMaps?.[season.season_number]) && (
									<Button disabled={!this.state?.flixSeries} variant="success" size="sm" className="ml-3 py-0 px-1" onClick={this.loadSeason.bind(this, season)}>
										load
									</Button>
								)}
							</Card.Header>
							<Accordion.Collapse eventKey={season.id}>
								<Card.Body className="p-4 d-flex flex-wrap">
									{[...Array(season.episode_count).keys()].map((num) => (
										<Button
											key={num + 1}
											variant={this.state.flixSeasonMaps?.[season.season_number]?.[num + 1] ? "primary" : "secondary"}
											size="sm"
											className="m-1"
											onClick={() => {
												this.setState({ selectedSeason: season });
												this.loadTmdbEpisode(this.state.tmdbSeries.id, season.season_number, num + 1);
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
	}
}

SeriesFormHolder.propTypes = {
	tmdb: PropTypes.object.isRequired,
}

export default SeriesFormHolder;