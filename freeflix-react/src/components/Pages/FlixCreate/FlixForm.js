import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ProgressBar } from 'react-bootstrap';
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
			<div className="flix-form w-100 my-2">
				<SimpleToast type="error" show={showToast} message={toastMessage} onClose={this.closeToast} />

				<input type="file" hidden ref={this.videoSelect} onChange={this.onVideoChange} />
				<input type="file" hidden ref={this.subtSelect} onChange={this.onSubtChange} accept=".srt" />

				{/* Header */}
				<div className="flix-form-header">
					<div className="flix-form-meta">
						<span className="flix-type-badge">{flixType}</span>
						{(flixType === 'movie' && flix) ? (
							<Link to={`/flix/movie/${flix.id}/${tmdb.id}`} className="flix-form-title-link">
								{tmdb.title || tmdb.name}
							</Link>
						) : (
							<span className="flix-form-title">
								{tmdb.title || tmdb.name}{episodeNumber ? ` — Ep. ${episodeNumber}` : ''}
							</span>
						)}
					</div>
					{flix && (
						<button className="flix-del-btn" onClick={this.delFlix}>
							&#x2715; Delete
						</button>
					)}
				</div>

				{/* Content */}
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
					{({ percentProgress, pause, isInitializing }) => (
						<div className="flix-form-body">

							{/* Video row */}
							<p className="flix-form-section-label">Video</p>
							<div className="flix-video-row">
								<div className="flix-video-status">
									{(typeof vidName === 'string' && vidName.trim() !== '') ? (
										<a className="flix-video-link" href={vidName} target="_blank" rel="noopener noreferrer">
											{flix?.title || tmdb?.title || tmdb?.name}
										</a>
									) : (
										<span className="flix-video-empty">No video uploaded yet.</span>
									)}
								</div>
								<div className="flix-form-actions">
									{percentProgress > 0 && (
										<button
											className="flix-action-btn flix-action-btn--danger"
											onClick={() => {
												this.fileUploadRef.current.cancelUpload();
												this.setState({ video: null, subt: null, cancelToken: null });
											}}
										>
											Cancel
										</button>
									)}
									<button className="flix-action-btn flix-action-btn--secondary" onClick={this.onVideoSelect}>
										{video ? '↺ Replace' : '↑ Select Video'}
									</button>
									{!flix && (
										<button
											className="flix-action-btn flix-action-btn--primary"
											disabled={this.state.isRegisterLoading}
											onClick={() => {
												this.setState({ isRegisterLoading: true });
												this.submitFlix(() => {
													if (this.state.video && this.fileUploadRef?.current) {
														this.fileUploadRef.current.setPause(false);
													}
													this.setState({ isRegisterLoading: false });
												});
											}}
										>
											{this.state.isRegisterLoading ? 'Registering…' : 'Register'}
										</button>
									)}
									{(flix && subt) && (
										<button
											className="flix-action-btn flix-action-btn--primary"
											onClick={() => {
												this.setState({ isRegisterLoading: true });
												this.patchFlix(() => {
													this.setState({ isRegisterLoading: false });
												});
											}}
										>
											Update
										</button>
									)}
								</div>
							</div>

							{/* Upload progress */}
							{(this.state?.video && flix) && (
								<div className="flix-upload-section">
									<p className="flix-form-section-label">
										{percentProgress <= 0 ? 'Ready to upload' : `Uploading — ${percentProgress}%`}
									</p>
									<div className="flix-upload-row">
										<ProgressBar now={percentProgress} className="flex-grow-1" />
										<button
											className="flix-action-btn flix-action-btn--secondary"
											disabled={isInitializing}
											style={isInitializing ? { pointerEvents: 'none', opacity: 0.45, cursor: 'not-allowed' } : {}}
											onClick={() => this.fileUploadRef.current.setPause(!pause)}
										>
											{percentProgress <= 0 ? 'Start' : (pause ? 'Resume' : 'Pause')}
										</button>
									</div>
								</div>
							)}
						</div>
					)}
				</FileUploader>

				{/* Subtitles */}
				{flix && (
					<div className="flix-subtitles-section">
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
