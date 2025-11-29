import React, {useState, useEffect} from 'react';
import axios from 'axios';

const ListFlix = ({flixTypeFilter, genreFilter, orderingFilter}) => {
	const [flixes, setFlixes] = useState([]);

	useEffect(() => {
		var conf = {params:{}};
		var ordering = orderingFilter;
		switch(orderingFilter){
			case 'latest':
				ordering = 'date_upload';
				break;
			case 'oldest':
				ordering = '-date_upload';
				break;
			case 'year':
				ordering = 'date_release';
				break;
		}

		conf.params.ordering = ordering;

		if(genreFilter !== 'all')
			conf.params.genre = genreFilter;

		const url = `/api/${flixTypeFilter.toLowerCase()}/`;
		axios.get(url, conf).then(resp => {
			console.log(resp.data);
		}).catch(err => {
			console.error(err);
		});
	}, [flixTypeFilter, genreFilter, orderingFilter]);

	return (
		<div className="h-100 d-flex mt-3">
		
		</div>
	);
}


export default ListFlix;