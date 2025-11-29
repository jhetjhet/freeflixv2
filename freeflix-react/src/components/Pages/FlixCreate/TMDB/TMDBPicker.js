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
			title: '',
			isTmdbBtnLoading: false,
			TMDBSearchResults: [],

			currPage: 1,
			totalPage: 0,
		}

		this.onTitleInputChange = this.onTitleInputChange.bind(this);
		this.loadTmdb = this.loadTmdb.bind(this);
	}

	onPageSelect(page, event){
		this.setState({currPage: page});
		this.requestTMDB(page);
	}

	onTitleInputChange(event){
		this.setState({title: event.target.value});
	}

	loadTmdb(event){
		event.preventDefault();
		this.setState({
			isTmdbBtnLoading: true,
			currPage: 1,
		});
		this.requestTMDB(1);
	}

	requestTMDB(page){
		const conf = {
			params: {
				api_key: process.env.REACT_APP_TMDB_API_KEY,
				query: this.state.title,
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
		var pagination = null;
		if(this.state.totalPage > 1){
			var paginationItems = [];
			const maxPageLent = this.maxPageLent;
			const {currPage, totalPage} = this.state;
			var maxPageHalf = Math.floor(maxPageLent / 2) + 1;
			var startPage = currPage >= maxPageHalf ? currPage - Math.floor(maxPageLent / 2) : 1;
			var endPage = (currPage + Math.floor(maxPageLent / 2)) < totalPage ? (currPage + Math.floor(maxPageLent / 2)) : totalPage;
			for(let page = startPage; page <= endPage; page++)
				paginationItems.push((
					<Pagination.Item key={page} onClick={this.onPageSelect.bind(this, page)} active={currPage === page}>
						{page}
					</Pagination.Item>
				));
			pagination = (
					<Pagination>
						{startPage !== 1 &&
							<React.Fragment>
								<Pagination.Item onClick={this.onPageSelect.bind(this, 1)}>
									{1}
								</Pagination.Item>
								<Pagination.Prev onClick={this.onPageSelect.bind(this, currPage-1)} />
								<Pagination.Ellipsis disabled />
							</React.Fragment>
						}
						{paginationItems}
						{endPage < totalPage &&
							<React.Fragment>
								<Pagination.Ellipsis disabled />
								<Pagination.Next onClick={this.onPageSelect.bind(this, currPage+1)} />
								<Pagination.Item onClick={this.onPageSelect.bind(this, totalPage)}>
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
						<input type="text" className="w-100 px-2 py-1 rounded-left" onChange={this.onTitleInputChange} value={this.state.title} />
						<Button 
							type="submit"
							className="tmdb-load-btn"
							disabled={this.props.disabled || this.state.isTmdbBtnLoading || this.state.title.length === 0}>
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
	disabled: PropTypes.bool,
	onTMDBSelect: PropTypes.func.isRequired,
}

export default TMDBPicker;