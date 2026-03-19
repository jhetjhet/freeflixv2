import React from 'react';

export const VideoPlayerContainer = ({
	children,
	className = '',
	containerRef,
	onMouseMove,
	onMouseLeave,
	style = {},
}) => (
    <div className="w-100 d-flex flex-row align-items-center justify-content-center px-3">
        <div
            ref={containerRef}
            className={"col-12 col-md-10 col-lg-8 p-0 " + className}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            style={{
                position: 'relative',
                minHeight: '360px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(170deg, #1c1c1c 0%, #0e0e0e 100%)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04), 0 1px 0 rgba(255,255,255,0.07) inset',
                ...style,
            }}
        >
            {children}
        </div>
	</div>
);
