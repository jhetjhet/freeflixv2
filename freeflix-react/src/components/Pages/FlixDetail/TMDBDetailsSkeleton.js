import React from 'react';

const TMDBDetailsSkeleton = () => {
	return (
		<div className="container">
			<div className="row justify-content-center">
				{/* Poster */}
				<div className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col-8">
					<div className="rounded p-1 bg-light w-100">
						<div className="skeleton-box w-100 rounded" style={{ height: '270px' }}></div>
					</div>
				</div>

				{/* Title / meta */}
				<div className="col-sm-6 mt-3 mt-sm-0">
					<div className="d-flex flex-column">
						<div className="skeleton-box rounded mb-2" style={{ height: '36px', width: '70%' }}></div>
						<div className="d-flex mb-2">
							<div className="skeleton-box rounded mr-2" style={{ height: '20px', width: '100px' }}></div>
							<div className="skeleton-box rounded" style={{ height: '20px', width: '80px' }}></div>
						</div>
						<div className="skeleton-box rounded" style={{ height: '16px', width: '120px' }}></div>
					</div>
				</div>
			</div>

			{/* Overview / credits */}
			<div className="row m-2 px-2 border-top">
				<div className="container">
					<div className="row">
						<div className="col-12 col-md-8">
							<div className="skeleton-box rounded mb-3 mt-2" style={{ height: '24px', width: '100px' }}></div>
							<div className="skeleton-box rounded mb-2" style={{ height: '14px', width: '100%' }}></div>
							<div className="skeleton-box rounded mb-2" style={{ height: '14px', width: '95%' }}></div>
							<div className="skeleton-box rounded mb-2" style={{ height: '14px', width: '90%' }}></div>
							<div className="skeleton-box rounded" style={{ height: '14px', width: '60%' }}></div>
						</div>
						<div className="col-12 col-md-4 mt-3 mt-md-0">
							<div className="skeleton-box rounded mb-2 mt-md-2" style={{ height: '16px', width: '80%' }}></div>
							<div className="skeleton-box rounded mb-2" style={{ height: '16px', width: '70%' }}></div>
							<div className="skeleton-box rounded mb-2" style={{ height: '16px', width: '75%' }}></div>
							<div className="skeleton-box rounded" style={{ height: '16px', width: '65%' }}></div>
						</div>
					</div>
				</div>
			</div>

			{/* Backdrops */}
			<div className="row mt-3">
				<div className="backdrop-imgs d-flex overflow-hidden">
					{[1, 2, 3].map(i => (
						<div key={i} className="mx-1 flex-shrink-0" style={{ height: '120px', minWidth: '200px' }}>
							<div className="skeleton-box rounded h-100 w-100"></div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default TMDBDetailsSkeleton;
