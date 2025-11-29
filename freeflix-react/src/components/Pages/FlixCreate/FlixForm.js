import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
	Button,
	ProgressBar,
} from 'react-bootstrap';
import FileUploader from './FileUploader';
import FlixSubtitles from './FlixSubtitles';

class FlixForm extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			video: null,
			subt: null,
			flix: null,
			cancelToken: null,
			pauseUploadVideo: false,
			isGetFlixLoading: false,
		}

		const { tmdb, flixType, seriesID } = this.props;
		this.flixUrl = flixType === 'movie' ? `/api/movie/${tmdb.id}/` : `/api/series/${seriesID}/season/${tmdb.season_number}/episode/${tmdb.episode_number}/`;

		this.videoSelect = React.createRef();
		this.subtSelect = React.createRef();
		this.fileUploadRef = React.createRef();

		this.onCancel = this.onCancel.bind(this);
		this.onVideoSelect = this.onVideoSelect.bind(this);
		this.onSubtSelect = this.onSubtSelect.bind(this);
		this.onVideoChange = this.onVideoChange.bind(this);
		this.onSubtChange = this.onSubtChange.bind(this);
		this.submitFlix = this.submitFlix.bind(this);
		this.patchFlix = this.patchFlix.bind(this);
		this.delFlix = this.delFlix.bind(this);
	}

	async componentDidMount() {
		this.setState({ isGetFlixLoading: true });

		axios.get(this.flixUrl).then(resp => {
			this.setState({
				flix: resp.data,
				video: null,
				subt: null,
			});
		}).catch(err => {
			console.error(err.message);
		}).finally(() => {
			this.setState({ isGetFlixLoading: false });
		});
	}

	onCancel(event) {
		const source = this.state.cancelToken;
		source.cancel('request cancel');
	}

	onVideoSelect(event) {
		event.preventDefault();
		this.videoSelect.current.click();
	}

	onSubtSelect(event) {
		event.preventDefault();
		this.subtSelect.current.click();
	}

	onVideoChange({ target: { files } }) {
		this.setState({ video: files[0] });
	}

	onSubtChange({ target: { files } }) {
		this.setState({ subt: files[0] });
	}

	submitFlix(callback = () => { }) {
		const { subt } = this.state;
		const { tmdb, flixType, seriesID } = this.props;
		var data = new FormData();

		if (subt) {
			data.append('subtitle', subt);
		}

		data.append('title', tmdb.title || tmdb.name);
		data.append('tmdb_id', tmdb.id);

		if (flixType === 'episode') {
			data.append('episode_number', tmdb.episode_number);
		} else if (flixType === 'movie') {
			data.append('date_release', tmdb.release_date);
			data.append('poster_path', tmdb.poster_path);
			data.append('genres', JSON.stringify(tmdb.genres.map(g => ({ tmdb_id: g.id, name: g.name }))));
		}

		const source = axios.CancelToken.source();
		const conf = {
			cancelToken: source.token,
			headers: {
				'Content-Type': 'multipart/form-data',
			}
		}

		const url = flixType === 'movie' ? '/api/movie/' : `/api/series/${seriesID}/season/${tmdb.season_number}/episode/`;

		axios.post(url, data, conf).then(resp => {
			this.setState({
				flix: resp.data,
				subt: null,
				cancelToken: null,
			});

			this.props.onSubmit(resp.data);
		}).catch(err => {
			if (!axios.isCancel(err))
				console.error(err.message);
		}).finally(() => {
			callback();
		});

		this.setState({ cancelToken: source });
	}

	patchFlix() {
		const { subt } = this.state;
		const source = axios.CancelToken.source();
		const conf = {
			cancelToken: source.token,
		}

		var data = new FormData();

		if (subt) {
			data.append('subtitle', subt);
		}

		axios.patch(this.flixUrl, data, conf).then(resp => {
			this.setState({
				flix: resp.data,
				subt: null,
				cancelToken: null,
			});
		}).catch(err => {
			console.error(err.message);
		});
	}

	delFlix() {
		axios.delete(this.flixUrl).then(resp => {
			this.setState({
				video: null,
				subt: null,
				flix: null,
				cancelToken: null,
			});

			this.fileUploadRef.current.cancelUpload();
			this.props.onDelete(this.props?.tmdb?.id);
		}).catch(err => {
			console.error(err.message);
		});
	}

	render() {
		const { video, subt, flix, isGetFlixLoading } = this.state;
		const { tmdb } = this.props;

		const seasonNumber = tmdb?.season_number ?? null;
		const episodeNumber = tmdb?.episode_number ?? null;

		var vidName = flix?.video_url || '';

		if (video) vidName = video.name;

		return (
			<div className="flix-form border border-flix bg-light rounded w-100 d-flex flex-column p-2 my-2">
				{(flix) &&
					<Button size="sm" variant="danger py-0 px-1 ml-auto" onClick={this.delFlix} className="flix-del-btn mr-2">
						delete
					</Button>}

				<input type="file" hidden ref={this.videoSelect} onChange={this.onVideoChange} />
				<input type="file" hidden ref={this.subtSelect} onChange={this.onSubtChange} accept=".srt" />
				<div className="flix-type-patch">
					<span>{this.props.flixType}</span>
				</div>
				<div className="mt-1 w-100 d-flex border-bottom border-flix">
					<span className="flix-form-title md-text">{this.props.tmdb.title || this.props.tmdb.name}{episodeNumber ? `- Episode ${episodeNumber}` : ''}</span>
				</div>

				{!isGetFlixLoading && (
					<FileUploader
						ref={this.fileUploadRef}
						_file={flix ? video : null}
						chunkSize={1048576 * 5}
						cookieNameId={flix?.tmdb_id ? flix.tmdb_id : ''}
						tmdbId={this?.props?.seriesID ?? flix?.tmdb_id}
						seasonNumber={seasonNumber}
						episodeNumber={episodeNumber}
						onFinish={() => {
							this.setState({ video: null, subt: null, cancelToken: null, percentProgress: 0 });
						}}
					>
						{({
							percentProgress,
							pause,
						}) => (
							<React.Fragment>
								<div className="d-flex mt-1 w-100">
									<div className="d-flex flex-column w-100 pr-2">
										<div className="d-flex">
											<span className="md-text">Video: </span>
											<input className="md-text w-100" type="text" disabled value={flix?.video_path_exists ? flix?.video_path : 'No video uploaded yet.'} />
										</div>
									</div>
									<div className="ml-auto mt-auto d-flex">
										{percentProgress > 0 && (
											<Button
												size="sm"
												className="mr-1 py-0 px-1"
												variant="danger"
												onClick={() => {
													this.fileUploadRef.current.cancelUpload();
													this.setState({ video: null, subt: null, cancelToken: null });
												}}
											>
												cancel
											</Button>
										)}

										{true &&
											<React.Fragment>
												<Button size="sm" className="mr-1 py-0 px-1" variant="warning" onClick={this.onVideoSelect}>
													video
												</Button>

												{!flix && (
													<Button size="sm" variant="success py-0 px-1" onClick={() => {
														this.submitFlix(() => {
															this.fileUploadRef.current.setPause(false);
														});
													}}>
														register
													</Button>
												)}

												{(flix && subt) && (
													<Button size="sm" variant="success py-0 px-1" onClick={() => {
														this.patchFlix();
													}}>
														update
													</Button>
												)}
											</React.Fragment>}
									</div>
								</div>

								{(this.state?.video && flix) && (
									<div className="upload-progress-cont">
										<ProgressBar now={percentProgress} label={`${percentProgress}%`} className="w-100" />
										<Button className="ml-2" size="sm" variant="secondary" onClick={() => this.fileUploadRef.current.setPause(!pause)}>
											{pause ? (percentProgress <= 0 ? 'Start' : 'Resume') : 'Pause'}
										</Button>
									</div>
								)}

							</React.Fragment>
						)}
					</FileUploader>
				)}

				{flix && (
					<div className="my-3">
						<FlixSubtitles 
							initial_subtitles={flix.subtitles} 
							media_base_url={this.flixUrl} 
						/>
					</div>
				)}
			</div>
		);
	}
}

FlixForm.propTypes = {
	tmdb: PropTypes.object.isRequired,
	flixType: PropTypes.string.isRequired,
	seriesID: PropTypes.number,
}

export default FlixForm;