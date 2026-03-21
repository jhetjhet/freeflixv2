import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
	Dropdown,
} from 'react-bootstrap';
import { useHistory, useLocation } from 'react-router-dom';
import ListFlix from './ListFlix.js';
import FlixPagination from './FlixPagination.js';

const VIDEO_STATUS_OPTIONS = [
	{ label: 'All',            value: 'all' },
    { label: 'Media Attached', value: 1     },
    { label: 'No Media',       value: 0     },
];

const ORDERING_OPTIONS = [
	{ label: 'Newest Upload',  value: '-date_upload'  },
	{ label: 'Oldest Upload',  value: 'date_upload'   },
	{ label: 'Newest Release', value: '-date_release' },
	{ label: 'Oldest Release', value: 'date_release'  },
];

const parsePage = (rawPage) => {
	const parsedPage = Number.parseInt(rawPage, 10);
	if (Number.isNaN(parsedPage) || parsedPage < 1) {
		return 1;
	}

	return parsedPage;
};

const FlixFilter = () => {
	const history = useHistory();
	const location = useLocation();

	const flixTypes = ['all', 'movie', 'series'];

	const [genres, setGenres] = useState(['all']);

	const queryParams = new URLSearchParams(location.search);
	const selectedFlixType = flixTypes.includes(queryParams.get('type'))
		? queryParams.get('type')
		: 'all';
	const selectedGenre = queryParams.get('genre') || 'all';
	const selectedOrdering = ORDERING_OPTIONS.find(o => o.value === queryParams.get('ordering'))
		? queryParams.get('ordering')
		: ORDERING_OPTIONS[0].value;
	const searchFilter = queryParams.get('search') || '';
	const currentPage = parsePage(queryParams.get('page'));
	const rawVideoExists = queryParams.get('video_exists');
	const videoExists = rawVideoExists === '1' ? 1 : rawVideoExists === '0' ? 0 : 'all';

	const [searchVal, setSearchVal] = useState(searchFilter);
	const [totalPages, setTotalPages] = useState(1);

	const updateQueryParams = (updates) => {
		const nextParams = new URLSearchParams(location.search);

		Object.entries(updates).forEach(([key, value]) => {
			if (value === '' || value === null || value === undefined) {
				nextParams.delete(key);
				return;
			}

			nextParams.set(key, value.toString());
		});

		const nextSearch = nextParams.toString();
		const currentUrl = `${location.pathname}${location.search}`;
		const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;

		if (nextUrl !== currentUrl) {
			history.push(nextUrl);
		}
	};

	useEffect(() => {
		var genreArr = [];
		axios.get('/api/genre/list/').then(resp => {
			for (let genre of resp.data)
				genreArr.push(genre.name);
			setGenres(g => [...g, ...genreArr]);
		}).catch((error) => {
			console.error(error);
		});
	}, []);

	useEffect(() => {
		setSearchVal(searchFilter);
	}, [searchFilter]);

	const onFlixTypeSelect = (item) => {
		updateQueryParams({
			type: item === 'all' ? null : item,
			page: 1,
		});
	}

	const onGenreSelect = (item) => {
		updateQueryParams({
			genre: item === 'all' ? null : item,
			page: 1,
		});
	}

	const onOrderSelect = (item) => {
		updateQueryParams({
			ordering: item,
			page: 1,
		});
	}

	const onVideoExistsSelect = (item) => {
		const parsed = item === 'all' ? null : item;
		updateQueryParams({
			video_exists: parsed,
			page: 1,
		});
	}

	const onSearchSubmit = (event) => {
		event.preventDefault();
		updateQueryParams({
			search: searchVal.trim(),
			page: 1,
		});
	}

	let flixPagination = null;

	if (totalPages > 1) {
		flixPagination = (
			<div className="d-flex justify-content-center my-4">
				<FlixPagination
					currentPage={currentPage}
					totalPages={totalPages}
					npages={7}
					onChange={(p) => updateQueryParams({ page: p })}
				/>
			</div>
		);
	}

	return (
		<div className="filterflix h-100 d-flex mt-3">
			<div className="container-fluid px-0">
				<div className="row justify-content-center">
					<div className="col-12 col-sm-10 col-md-8 col-lg-6 d-flex justify-content-center align-items-center">
						<form className="search-bar d-flex" onSubmit={onSearchSubmit}>
							<input
								className="w-100"
								type="text"
								placeholder="Search..."
								value={searchVal}
								onChange={(event) => { setSearchVal(event.target.value) }}
							/>
							<button type="submit" className="rounded">
								<svg width="1.3em" height="1.3em" viewBox="0 0 16 16" className="bi bi-search" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
									<path fillRule="evenodd" d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z" />
									<path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
								</svg>
							</button>
						</form>
					</div>
				</div>
				<div className="row justify-content-center align-items-center mt-2">
					<div className="col-12 col-sm-6 col-md-auto d-flex align-items-center justify-content-center mb-2">
						<span className="md-text mr-1">Category </span>
						<Dropdown onSelect={onFlixTypeSelect}>
							<Dropdown.Toggle variant="flix" size="sm">
								{selectedFlixType}
							</Dropdown.Toggle>
							<Dropdown.Menu>
								{flixTypes.map(item => (
									<Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown>
					</div>
					<div className="col-12 col-sm-6 col-md-auto d-flex align-items-center justify-content-center mb-2">
						<span className="md-text mr-1">Genre </span>
						<Dropdown onSelect={onGenreSelect}>
							<Dropdown.Toggle variant="flix" size="sm">
								{selectedGenre}
							</Dropdown.Toggle>
							<Dropdown.Menu style={{
								maxHeight: '3em',
								overFlowY: 'scroll',
							}}>
								{genres.map(item => (
									<Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown>
					</div>
					<div className="col-12 col-sm-6 col-md-auto d-flex align-items-center justify-content-center mb-2">
						<span className="md-text mr-1">Order By </span>
						<Dropdown onSelect={onOrderSelect}>
							<Dropdown.Toggle variant="flix" size="sm">
								{ORDERING_OPTIONS.find(o => o.value === selectedOrdering)?.label ?? selectedOrdering}
							</Dropdown.Toggle>
							<Dropdown.Menu>
								{ORDERING_OPTIONS.map(item => (
									<Dropdown.Item key={item.value} eventKey={item.value}>{item.label}</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown>
					</div>
					<div className="col-12 col-sm-6 col-md-auto d-flex align-items-center justify-content-center mb-2">
						<span className="md-text mr-1">Video </span>
						<Dropdown onSelect={onVideoExistsSelect}>
							<Dropdown.Toggle variant="flix" size="sm">
								{VIDEO_STATUS_OPTIONS.find(o => o.value === videoExists)?.label ?? 'All'}
							</Dropdown.Toggle>
							<Dropdown.Menu>
								{VIDEO_STATUS_OPTIONS.map(item => (
									<Dropdown.Item key={String(item.value)} eventKey={String(item.value)}>{item.label}</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown>
					</div>
				</div>
				{flixPagination}
				<div className={`${flixPagination ? '' : 'my-4'}`}>
					<ListFlix
						page={currentPage}
						searchFilter={searchFilter}
						flixTypeFilter={selectedFlixType}
						genreFilter={selectedGenre}
						orderingFilter={selectedOrdering}
						videoExistsFilter={videoExists}
						onResponse={(data) => {
							setTotalPages(data?.total_pages ?? 1);
						}}
					/>
				</div>
				{flixPagination}
			</div>
		</div>
	);
}
export default FlixFilter;