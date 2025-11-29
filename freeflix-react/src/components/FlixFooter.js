import React from 'react';

function FlixFooter(props){
	const date = new Date();
	const year = date.getFullYear();
	const day = date.getDate();
	const month = date.getMonth();

	return (
		<footer className="mt-auto">
			<div className="mx-auto my-3">
				<p className="my-auto text-light">
					<span className="freeflix-ft text-flix">FreeFlix</span>{' '}©{' '}
					<span>{`${year}-${day < 10 ? '0' : ''}${day}-${month < 10 ? '0' : ''}${month}`}</span>
				</p>
			</div>
		</footer>
	);
}

export default FlixFooter;