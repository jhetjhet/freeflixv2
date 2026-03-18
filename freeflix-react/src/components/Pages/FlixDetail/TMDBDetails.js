import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import CreditsHolder from './CreditsHolder';

const BackdropsViewer = ({ images_backdrops = [], title = "" }) => {
	const [lightboxIndex, setLightboxIndex] = useState(null);

	const showPrev = useCallback(() => {
		setLightboxIndex(i => (i - 1 + images_backdrops.length) % images_backdrops.length);
	}, [images_backdrops.length]);

	const showNext = useCallback(() => {
		setLightboxIndex(i => (i + 1) % images_backdrops.length);
	}, [images_backdrops.length]);

	useEffect(() => {
		if (lightboxIndex === null) return;
		const handleKey = (e) => {
			if (e.key === 'ArrowLeft') showPrev();
			else if (e.key === 'ArrowRight') showNext();
			else if (e.key === 'Escape') setLightboxIndex(null);
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [lightboxIndex, showPrev, showNext]);

	useEffect(() => {
		document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';
		return () => { document.body.style.overflow = ''; };
	}, [lightboxIndex]);

	if (!images_backdrops.length) return null;

	return (
		<>
			<div className="row">
				<div className="backdrop-imgs d-flex">
					{images_backdrops.map((b, idx) => (
						<div key={b.file_path} className="h-100 mx-1" style={{ cursor: 'pointer' }} onClick={() => setLightboxIndex(idx)}>
							<img className="h-100" src={`${process.env.REACT_APP_TMDB_IMAGE_BASE_URL}${b.file_path}`} alt={`${title}:(backdrop)`} />
						</div>
					))}
				</div>
			</div>
			{lightboxIndex !== null && ReactDOM.createPortal(
				<div
					style={{
						position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
						background: 'rgba(0,0,0,0.85)', zIndex: 9999,
						display: 'flex', alignItems: 'center', justifyContent: 'center',
					}}
					onClick={() => setLightboxIndex(null)}
				>
					{images_backdrops.length > 1 && (
						<button
							style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 48, cursor: 'pointer', lineHeight: 1, padding: '4px 14px', borderRadius: 4, zIndex: 1 }}
							onClick={(e) => { e.stopPropagation(); showPrev(); }}
						>&#8249;</button>
					)}
					<div
						style={{ position: 'relative', maxWidth: '85vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							style={{ position: 'absolute', top: -36, right: 0, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '5px 10px', borderRadius: 4 }}
							onClick={() => setLightboxIndex(null)}
						>&#x2715;</button>
						<img
							src={`${process.env.REACT_APP_TMDB_IMAGE_BASE_URL}${images_backdrops[lightboxIndex].file_path}`}
							alt={`${title} backdrop ${lightboxIndex + 1}`}
							style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 4, boxShadow: '0 4px 32px rgba(0,0,0,0.7)', display: 'block' }}
						/>
						{images_backdrops.length > 1 && (
							<div style={{ marginTop: 10, color: '#ccc', fontSize: 14, background: 'rgba(0,0,0,0.45)', padding: '2px 12px', borderRadius: 4 }}>
								{lightboxIndex + 1} / {images_backdrops.length}
							</div>
						)}
					</div>
					{images_backdrops.length > 1 && (
						<button
							style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 48, cursor: 'pointer', lineHeight: 1, padding: '4px 14px', borderRadius: 4, zIndex: 1 }}
							onClick={(e) => { e.stopPropagation(); showNext(); }}
						>&#8250;</button>
					)}
				</div>
				, document.body)}
		</>
	);
};

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
		<>
			<div className="container">
				<div className="row justify-content-center">
					{poster_path && (
						<div className="col-xl-3 col-lg-3 col-md-4 col-sm-4 col-8">
							<div className="rounded p-1 bg-light w-100">
								<img className="w-100" src={`${process.env.REACT_APP_TMDB_IMAGE_BASE_URL}${poster_path}`} alt={`${title}:(POSTER)`} />
							</div>
						</div>
					)}
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
				<BackdropsViewer images_backdrops={images_backdrops} title={title} />
			</div>
		</>
	);
};

export default TMDBDetails;