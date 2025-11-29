import React from 'react';
import CreditsHolder from './CreditsHolder';

const TMDBDetails = ({
	poster_path = "",
	title = "",
	original_title = "",
	release_date = "",
	overview = "",
	genres = [],
	images_backdrops = [],
	credits = {
		cast: [],
		crew: [],
	},
	video_path = null,
}) => {
	return (
		<div className="container">
			<div className="row justify-content-center">
				<div className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col-8">
					<div className="rounded p-1 bg-light w-100">
						<img className="w-100" src={`${process.env.REACT_APP_TMDB_IMAGE_BASE_URL}${poster_path}`} alt={`${title}:(POSTER)`} />
					</div>
				</div>
				<div className="col-sm-6">
					<div className="d-flex flex-column">
						<h1>{title}</h1>
						<div>
							<span className="border rounded">{original_title}</span>{' '}
							<span>{release_date}</span>
						</div>
						{genres?.length > 0 && (
							<span>
								{genres?.map(g => (g.name)).join('/')}
							</span>
						)}
						{/* {video_path && (
							<div>
								<a
									href={`${video_path}`}
									target="_blank"
									download
									className="me-2 d-block"
									style={{ width: 'fit-content' }}
								>
									download
								</a>
							</div>
						)} */}
					</div>
				</div>
			</div>
			<div className="row m-2 px-2 border-top">
				<div className="container">
					<div className="row">
						<div className="col-12 col-md-8">
							<h4>Overview</h4>
							{overview ?
								<p className="md-text p-0">{overview}</p> : <p>This movie dont have an overview.</p>
							}
						</div>
						<div className="col-12 col-md-4">
							<div>
								{credits &&
									<CreditsHolder casts={credits?.cast ?? []} crews={credits?.crew ?? []} />}
							</div>
						</div>
					</div>
				</div>
			</div>
			{images_backdrops?.length > 0 && (
				<div className="row">
					<div className="backdrop-imgs d-flex">
						{images_backdrops?.map(b => (
							<div key={b.file_path} className="h-100 mx-1">
								<img className="h-100" src={`${process.env.REACT_APP_TMDB_IMAGE_BASE_URL}${b.file_path}`} alt={`${title}:(backdrop)`} />
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default TMDBDetails;