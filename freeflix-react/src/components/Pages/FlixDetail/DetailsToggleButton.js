import React, { useState } from 'react';

const LS_KEY = 'detailsKeepMinimize';

const DetailsToggleButton = ({ children }) => {
	const [keepMinimize, setKeepMinimize] = useState(() => localStorage.getItem(LS_KEY) === 'true');
	const [expanded, setExpanded] = useState(() => !(localStorage.getItem(LS_KEY) === 'true'));

	const toggle = () => setExpanded(prev => !prev);

	const handleKeepMinimize = (e) => {
		const checked = e.target.checked;
		setKeepMinimize(checked);
		localStorage.setItem(LS_KEY, String(checked));
	};

	return (
		<>
			<div style={{ overflow: 'hidden', maxHeight: expanded ? '2500px' : '0', opacity: expanded ? 1 : 0, transition: 'max-height 0.4s ease, opacity 0.25s ease', pointerEvents: expanded ? 'auto' : 'none' }}>
				{children}
			</div>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBlock: '16px', width: '100%' }}>
				<button
					type="button"
					onClick={toggle}
					onMouseEnter={e => { e.currentTarget.style.color = '#f2f2f2'; e.currentTarget.style.background = 'rgba(229,9,20,0.08)'; }}
					onMouseLeave={e => { e.currentTarget.style.color = '#777'; e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; }}
					style={{
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
				<label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#777', fontSize: '0.62rem', letterSpacing: '0.09em', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
					<input
						type="checkbox"
						checked={keepMinimize}
						onChange={handleKeepMinimize}
						style={{ accentColor: '#e50914', cursor: 'pointer' }}
					/>
					Keep Minimize
				</label>
			</div>
		</>
	);
};

export default DetailsToggleButton;
