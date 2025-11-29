import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {
	Dropdown,
} from 'react-bootstrap';
import ListFlix from './ListFlix.js';

const FlixFilter = (props) => {
	const [selectedFlixType, setSelectedFlixType] = useState('all');
	const flixTypes = ['all', 'movie', 'series'];

	const [selectedGenre, setGenre] = useState('all');
	const [genres, setGenres] = useState(['all']);

	const [selectedOrdering, setOrdering] = useState('latest');
	const orderingLists = ['latest', 'oldest', 'title', 'year'];

	useEffect(() => {
		var genreArr = [];
		axios.get('/api/genre/list/').then(resp => {
			for(let genre of resp.data)
				genreArr.push(genre.name);
			setGenres([...genres, ...genreArr]);
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

	return(
		<div className="h-100 d-flex mt-3">
			<div className="w-100">
				<div className="w-100">
					<input className="w-100" type="text" />
				</div>
				<div className="w-100 d-flex justify-content-center mt-2">
					<Dropdown onSelect={onFlixTypeSelect} className="mr-2">
						<Dropdown.Toggle variant="secondary" size="sm">
							{selectedFlixType}
						</Dropdown.Toggle>
						<Dropdown.Menu>
							{flixTypes.map(item => (
								<Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
							))}
						</Dropdown.Menu>
					</Dropdown>
					<Dropdown onSelect={onGenreSelect} className="mr-2">
						<Dropdown.Toggle variant="secondary" size="sm">
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
					<Dropdown onSelect={onOrderSelect} className="mr-2">
						<Dropdown.Toggle variant="secondary" size="sm">
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