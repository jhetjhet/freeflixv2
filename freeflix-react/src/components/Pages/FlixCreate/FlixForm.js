import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
	Button,
	ProgressBar,
} from 'react-bootstrap';
import FileUploader from './FileUploader';
import FlixSubtitles from './FlixSubtitles';
import SimpleToast from '../../toast/SimpleToast';

class FlixForm extends React.Component {

	constructor(props) {
		super(props);

		this.state = {
			video: null,
			subt: null,
			cancelToken: null,
			isRegisterLoading: false,
			toastMessage: '',
			showToast: false,
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
		this.closeToast = this.closeToast.bind(this);
		this.handleRequestError = this.handleRequestError.bind(this);
	}

	getErrorMessage(err) {
		const detail = err?.response?.data?.detail;

		if (Array.isArray(detail)) {
			return detail.join(' ');
		}

		if (typeof detail === 'string' && detail.trim() !== '') {
			return detail;
		}

		return err?.message || 'Request failed.';
	}

	closeToast() {
		this.setState({ showToast: false, toastMessage: '' });
	}

	handleRequestError(err) {
		if (axios.isCancel(err)) {
			return;
		}

		console.error(err.message);

		if (err?.response?.status === 403) {
			this.setState({
				showToast: true,
				toastMessage: this.getErrorMessage(err),
			});
		}
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
				subt: null,
				cancelToken: null,
				showToast: false,
				toastMessage: '',
			});

			this.props.onFlixChange();
		}).catch(err => {
			this.handleRequestError(err);
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
				subt: null,
				cancelToken: null,
				showToast: false,
				toastMessage: '',
			});
			this.props.onFlixChange();
		}).catch(err => {
			this.handleRequestError(err);
		});
	}

	delFlix() {
		axios.delete(this.flixUrl).then(resp => {
			this.setState({
				video: null,
				subt: null,
				cancelToken: null,
				showToast: false,
				toastMessage: '',
			});

			this.fileUploadRef.current.cancelUpload();
			this.props.onDelete();
		}).catch(err => {
			this.handleRequestError(err);
		});
	}

	render() {
		const { video, subt, showToast, toastMessage } = this.state;
		const { flix, flixType } = this.props;
		const { tmdb } = this.props;

		const seasonNumber = tmdb?.season_number ?? null;
		const episodeNumber = tmdb?.episode_number ?? null;

		var vidName = flix?.video_path_exists ? flix?.video_url : '';

		if (video) vidName = video.name;

		return (
			<div className="flix-form border border-flix bg-light rounded w-100 d-flex flex-column p-2 my-2">
				<SimpleToast type="error" show={showToast} message={toastMessage} onClose={this.closeToast} />
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
					{(flixType === 'movie' && flix) ? (
						<Link
							to={`/flix/movie/${flix.id}/${tmdb.id}`}
							className="flix-form-title md-text text-primary"
							style={{ textDecoration: 'underline' }}
						>
							{tmdb.title || tmdb.name}
						</Link>
					) : (
						<span className="flix-form-title md-text">{tmdb.title || tmdb.name}{episodeNumber ? `- Episode ${episodeNumber}` : ''}</span>
					)}
				</div>

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
					this.videoSelect.current.value = null;
					this.props.onFlixChange();
				}}
					>
						{({
							percentProgress,
							pause,
							isInitializing,
						}) => (
							<React.Fragment>
								<div className="d-flex mt-1 w-100">
									<div className="d-flex flex-column w-100 pr-2">
											<div className="d-flex align-items-center">
											<span className="md-text mr-1">Video: </span>
											{(typeof vidName === 'string' && vidName.trim() !== '') ? (
												<a className="md-text text-primary" href={vidName} target="_blank" rel="noopener noreferrer">
													{flix?.title || tmdb?.title || tmdb?.name}
												</a>
											) : (
												<span className="md-text text-muted">No video uploaded yet.</span>
											)}
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
													<Button
														disabled={this.state.isRegisterLoading}
														size="sm"
														variant="success"
														onClick={() => {
															this.setState({ isRegisterLoading: true });

															this.submitFlix(() => {
																if (this.state.video && this.fileUploadRef?.current) {
																	this.fileUploadRef.current.setPause(false);
																}

																this.setState({ isRegisterLoading: false });
															});
														}}>
														register
													</Button>
												)}

												{(flix && subt) && (
													<Button size="sm" variant="success py-0 px-1" onClick={() => {
														this.setState({ isRegisterLoading: true });

														this.patchFlix(() => {
															this.setState({ isRegisterLoading: false });
														});
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
										<Button className="ml-2" size="sm" variant="secondary" disabled={isInitializing} style={isInitializing ? { pointerEvents: 'none', opacity: 0.65, cursor: 'not-allowed' } : {}} onClick={() => this.fileUploadRef.current.setPause(!pause)}>
											{percentProgress <= 0 ? 'Start' : (pause ? 'Resume' : 'Pause')}
										</Button>
									</div>
								)}

							</React.Fragment>
						)}
					</FileUploader>

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
	flix: PropTypes.object,
	flixType: PropTypes.string.isRequired,
	seriesID: PropTypes.number,
	onFlixChange: PropTypes.func.isRequired,
	onDelete: PropTypes.func,
}

export default FlixForm;
