import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
	Button,
	Spinner,
	Pagination,
} from 'react-bootstrap';
import TMDBCard from './TMDBCard.js';

class TMDBPicker extends React.Component {

	constructor(props){
		super(props);
		this.maxPageLent = 6;
		this.state = {
			inputTitle: props.title,
			isTmdbBtnLoading: false,
			TMDBSearchResults: [],
			totalPage: 0,
		}

		this.onTitleInputChange = this.onTitleInputChange.bind(this);
		this.loadTmdb = this.loadTmdb.bind(this);
	}

	componentDidMount() {
		if (this.props.title && this.props.page) {
			this.requestTMDB(this.props.page);
		}
	}

	componentDidUpdate(prevProps) {
		const titleChanged = prevProps.title !== this.props.title;
		const pageChanged = prevProps.page !== this.props.page;
		const typeChanged = prevProps.flixType !== this.props.flixType;

		if (typeChanged) {
			this.setState({ TMDBSearchResults: [], totalPage: 0, inputTitle: '' });
			return;
		}

		// Keep local input in sync when URL title changes (e.g. browser back/forward)
		if (titleChanged) {
			this.setState({ inputTitle: this.props.title });
		}

		if ((titleChanged || pageChanged) && this.props.title) {
			this.requestTMDB(this.props.page);
		}
	}

	onPageSelect(page){
		this.props.onParamsChange({ page });
	}

	onTitleInputChange(event){
		// Only update local state — do NOT push to URL on every keystroke
		this.setState({ inputTitle: event.target.value });
	}

	loadTmdb(event){
		event.preventDefault();
		const { inputTitle } = this.state;
		if (!inputTitle) return;
		// Push title + reset page to URL; componentDidUpdate will fire the API call
		this.props.onParamsChange({ title: inputTitle, page: 1 });
		// If title and page are already the same in the URL, componentDidUpdate won't fire, so call directly
		if (this.props.title === inputTitle && this.props.page === 1) {
			this.requestTMDB(1);
		}
	}

	requestTMDB(page){
		this.setState({ isTmdbBtnLoading: true });
		const conf = {
			params: {
				api_key: process.env.REACT_APP_TMDB_API_KEY,
				query: this.props.title,
				page: page,
			},
		}
		axios.get(`https://api.themoviedb.org/3/search/${this.props.flixType}`, conf).then(resp => {
			const results = [];
			for(let result of resp.data.results){
				result.flix_type = this.props.flixType;
				results.push(result);
			}
			this.setState({
				TMDBSearchResults: results,
				isTmdbBtnLoading: false,
				totalPage: resp.data.total_pages,
			});
		});
	}

	render(){
		const { page: currPage } = this.props;
		const { totalPage } = this.state;

		var pagination = null;
		if(totalPage > 1){
			var paginationItems = [];
			const maxPageLent = this.maxPageLent;
			var maxPageHalf = Math.floor(maxPageLent / 2) + 1;
			var startPage = currPage >= maxPageHalf ? currPage - Math.floor(maxPageLent / 2) : 1;
			var endPage = (currPage + Math.floor(maxPageLent / 2)) < totalPage ? (currPage + Math.floor(maxPageLent / 2)) : totalPage;
			for(let page = startPage; page <= endPage; page++)
				paginationItems.push((
					<Pagination.Item key={page} onClick={() => this.onPageSelect(page)} active={currPage === page}>
						{page}
					</Pagination.Item>
				));
			pagination = (
					<Pagination>
						{startPage !== 1 &&
							<React.Fragment>
								<Pagination.Item onClick={() => this.onPageSelect(1)}>
									{1}
								</Pagination.Item>
								<Pagination.Prev onClick={() => this.onPageSelect(currPage - 1)} />
								<Pagination.Ellipsis disabled />
							</React.Fragment>
						}
						{paginationItems}
						{endPage < totalPage &&
							<React.Fragment>
								<Pagination.Ellipsis disabled />
								<Pagination.Next onClick={() => this.onPageSelect(currPage + 1)} />
								<Pagination.Item onClick={() => this.onPageSelect(totalPage)}>
									{totalPage}
								</Pagination.Item>
							</React.Fragment>
						}
					</Pagination>
				);
		}
		return (
			<div className="tmdb-picker">
				<form onSubmit={this.loadTmdb}>
					<div className="w-100 d-flex mb-2">
				<input placeholder="Search for a movie or series" type="text" className="w-100 px-2 py-1 rounded-left" onChange={this.onTitleInputChange} value={this.state.inputTitle} />
					<Button 
						type="submit"
						className="tmdb-load-btn"
						disabled={this.props.disabled || this.state.isTmdbBtnLoading || this.state.inputTitle.length === 0}>
							{this.state.isTmdbBtnLoading && 
								<div className="tmdb-btn-spinner">
									<Spinner
										as="span"
										animation="grow"
										size="sm"
										role="status"
										aria-hidden="true"
									/>
								</div>
							}
							<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
								style={{
									maxWidth: '86px',
								}}
								alt="TMDB logo"
							/>
						</Button>
					</div>
				</form>
				<div className="tmdb-results rounded">
					{this.state.TMDBSearchResults.map(result => (
						<TMDBCard key={result.id} tmdb={result} onTMDBSelect={this.props.onTMDBSelect} />
					))}
				</div>
				<div className="d-flex justify-content-center mt-2">
					{pagination}
				</div>
			</div>
		);
	}
}

TMDBPicker.defaultProps = {
	disabled: false,
}

TMDBPicker.propTypes = {
	flixType: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	page: PropTypes.number.isRequired,
	onParamsChange: PropTypes.func.isRequired,
	disabled: PropTypes.bool,
	onTMDBSelect: PropTypes.func.isRequired,
}

export default TMDBPicker;