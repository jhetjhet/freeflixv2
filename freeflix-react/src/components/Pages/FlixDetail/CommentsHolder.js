import React, {useEffect} from 'react';

export const CommentsHolder = ({tmdb_id}) => {

	const socket = new WebSocket(`ws://${window.location.host}/ws/flix/feeds/${tmdb_id}/`);

	useEffect(() => {
		
	}, []);

	return(
		<div>
			<h1>WEBSOCKET {tmdb_id}</h1>
		</div>
	);
}