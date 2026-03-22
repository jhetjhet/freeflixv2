import React from 'react';

function FlixFooter() {
	const date = new Date();
	const year = date.getFullYear();

	return (
		<footer className="mt-auto">
			<div className="mx-auto my-3">
				<p className="my-auto text-light">
					<span className="freeflix-ft text-flix">FooFlix</span>{' '}©{' '}
					<span>{year}</span>
				</p>
			</div>
		</footer>
	);
}

export default FlixFooter;