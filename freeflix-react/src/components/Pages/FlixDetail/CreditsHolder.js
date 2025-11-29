import React, {useState} from 'react';

const Credit = ({name, character, profilePath}) => {

	return(
		<div className="credit rounded d-flex">
			<div className="profile">
				<img src={`${process.env.REACT_APP_TMDB_IMAGE_BASE_URL}${profilePath}`} alt={`${name}(PROFILE)`} />
			</div>
			<div className="d-flex flex-column justify-content-center">
				<span>{character}</span>
				<span>{name}</span>
			</div>
		</div>
	);
}

const CreditsHolder = ({casts, crews}) => {
	const maxCredit = 5;

	const [showAllCasts, setShowAllCasts] = useState(false);
	// const [showAllCrews, setShowAllCrews] = useState(false);

	const onShowAllCasts = (event) => {
		event.preventDefault();
		setShowAllCasts(!showAllCasts);
	}

	var castCredits = [];
	for(var i = 0; (i < maxCredit || showAllCasts) && i < casts.length; i++){
		const c = casts[i];
		castCredits.push(
			<Credit 
				key={c.credit_id}
				name={c.name}
				character={c.character}
				profilePath={c.profile_path}
			/>
		);
	}

	var director = crews.find(c => c.job.toLowerCase() === 'director');

	return(
		<div className="credit-holder d-flex flex-column">
			{director && (
				<React.Fragment>
					<span>Casts</span>
					<Credit 
						key={director.credit_id}
						name={director.name}
						character={director.character}
						profilePath={director.profile_path}
					/>
				</React.Fragment>
			)}
			<span>Casts</span>
			<div className="casts">
				{castCredits}
				{(casts.length > maxCredit) &&
					<a href="#" className="sm-text" onClick={onShowAllCasts}>
						{(!showAllCasts) ? 'show all..' : 'show less..'}
					</a>
				}
			</div>
		</div>
	);
}

export default CreditsHolder;