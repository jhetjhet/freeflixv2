import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {
	Dropdown,
} from 'react-bootstrap';
import ListFlix from './ListFlix.js';

const FlixFilter = () => {
	const [selectedFlixType, setSelectedFlixType] = useState('all');
	const flixTypes = ['all', 'movie', 'series'];

	const [selectedGenre, setGenre] = useState('all');
	const [genres, setGenres] = useState(['all']);

	const [selectedOrdering, setOrdering] = useState('latest');
	const orderingLists = ['latest', 'oldest', 'title', 'year'];

	const [searchFilter, setSearchFilter] = useState('');

	const [searchVal, setSearchVal] = useState('');

	useEffect(() => {
		var genreArr = [];
		axios.get('/api/genre/list/').then(resp => {
			for(let genre of resp.data)
				genreArr.push(genre.name);
			setGenres(g => [...g, ...genreArr]);
		}).catch((error) => {
			console.error(error);
		});
	}, []);

	const onFlixTypeSelect = (item) => {
		setSelectedFlixType(item);
	}

	const onGenreSelect = (item) => {
		setGenre(item);
	}

	const onOrderSelect = (item) => {
		setOrdering(item);
	}

	const onSearchSubmit = (event) => {
		event.preventDefault();
		setSearchFilter(searchVal);
	}

	return(
		<div className="filterflix h-100 d-flex mt-3">
			<div className="w-100">
				<div className="w-100 d-flex justify-content-center">
					<form className="search-bar d-flex" onSubmit={onSearchSubmit}>
						<input 
							className="w-100" 
							type="text" 
							placeholder="Search..." 
							value={searchVal} 
							onChange={(event) => {setSearchVal(event.target.value)}}
						/>
						<button type="submit" className="rounded">
							<svg width="1.3em" height="1.3em" viewBox="0 0 16 16" className="bi bi-search" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
								<path fillRule="evenodd" d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z"/>
								<path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
							</svg>
						</button>
					</form>
				</div>
				<div className="w-100 d-flex justify-content-center align-items-center mt-2">
					<span className="md-text mr-1">Category </span>
					<Dropdown onSelect={onFlixTypeSelect} className="mr-2">
						<Dropdown.Toggle variant="flix" size="sm">
							{selectedFlixType}
						</Dropdown.Toggle>
						<Dropdown.Menu>
							{flixTypes.map(item => (
								<Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>
					<span className="md-text mr-1">Genre </span>
					<Dropdown onSelect={onGenreSelect} className="mr-2">
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
					<span className="md-text mr-1">Order By </span>
					<Dropdown onSelect={onOrderSelect} className="mr-2">
						<Dropdown.Toggle variant="flix" size="sm">
							{selectedOrdering}
						</Dropdown.Toggle>
						<Dropdown.Menu>
							{orderingLists.map(item => (
								<Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>
				</div>
				<div>
					<ListFlix 
						searchFilter={searchFilter}
						flixTypeFilter={selectedFlixType} 
						genreFilter={selectedGenre}
						orderingFilter={selectedOrdering}
					/>
				</div>
			</div>
		</div>
	);
}
export default FlixFilter;