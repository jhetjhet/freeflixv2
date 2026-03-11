import React from 'react';

export const ClientCustomControl = ({
	areControlsVisible,
	isFullscreen,
	isMuted,
	volume,
	onInteract,
	onToggleFullscreen,
	onToggleMute,
	onVolumeChange,
}) => (
	<div
		onMouseDownCapture={onInteract}
		onTouchStartCapture={onInteract}
		onKeyDownCapture={onInteract}
		onChangeCapture={onInteract}
		style={{
			position: 'absolute',
			right: '1rem',
			bottom: '1rem',
			zIndex: 3,
			display: 'flex',
			alignItems: 'center',
			gap: '0.75rem',
			padding: '0.65rem 0.8rem',
			borderRadius: '999px',
			background: 'rgba(15, 15, 15, 0.72)',
			opacity: areControlsVisible ? 1 : 0,
			transform: areControlsVisible ? 'translateY(0)' : 'translateY(6px)',
			transition: 'opacity 180ms ease, transform 180ms ease',
			pointerEvents: areControlsVisible ? 'auto' : 'none',
		}}
	>
		<button
			type="button"
			onClick={onToggleMute}
			aria-label={isMuted ? 'Unmute video' : 'Mute video'}
			style={{
				border: 'none',
				background: 'transparent',
				color: '#fff',
				fontSize: '0.85rem',
				lineHeight: 1,
				cursor: 'pointer',
				padding: 0,
			}}
		>
			{isMuted || volume === 0 ? 'Unmute' : 'Mute'}
		</button>
		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			value={isMuted ? 0 : volume}
			onChange={onVolumeChange}
			aria-label="Video volume"
			style={{
				width: '7rem',
				cursor: 'pointer',
			}}
		/>
		<button
			type="button"
			onClick={onToggleFullscreen}
			aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
			style={{
				border: 'none',
				background: 'transparent',
				color: '#fff',
				fontSize: '0.85rem',
				lineHeight: 1,
				cursor: 'pointer',
				padding: 0,
			}}
		>
			{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
		</button>
	</div>
);