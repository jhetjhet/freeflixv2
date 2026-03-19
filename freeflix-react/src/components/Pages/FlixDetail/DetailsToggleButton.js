import React from 'react';

const DetailsToggleButton = ({ expanded, onToggle }) => (
	<button
		type="button"
		onClick={onToggle}
		onMouseEnter={e => { e.currentTarget.style.color = '#f2f2f2'; e.currentTarget.style.background = 'rgba(229,9,20,0.08)'; }}
		onMouseLeave={e => { e.currentTarget.style.color = '#777'; e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; }}
		style={{
            marginInline: 'auto',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			gap: '0.4rem',
			background: 'rgba(0,0,0,0.25)',
			border: '1px solid rgba(229,9,20,0.18)',
            padding: '8px',
            borderRadius: '8px',
			color: '#777',
			fontSize: '0.62rem',
			letterSpacing: '0.09em',
			textTransform: 'uppercase',
			cursor: 'pointer',
			transition: 'color 0.15s, background 0.15s',
            marginBlock: '16px',
		}}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="10"
			height="10"
			fill="currentColor"
			viewBox="0 0 16 16"
			style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
		>
			<path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
		</svg>
		{expanded ? 'Minimize details' : 'Expand details'}
	</button>
);

export default DetailsToggleButton;
