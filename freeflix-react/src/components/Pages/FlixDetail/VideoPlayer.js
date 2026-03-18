import React, { useMemo, useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';

const STORAGE_KEY = "video-progress";
const MAX_VIDEOS = 20;
const formatTime = (seconds) => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// helpers
const getProgressStore = () => {
	const raw = localStorage.getItem(STORAGE_KEY);
	return raw ? JSON.parse(raw) : {};
};

const saveProgressStore = (store) => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const saveVideoProgress = (videoId, time) => {
	let store = getProgressStore();

	store[videoId] = {
		time,
		updated: Date.now()
	};

	// enforce limit (20 videos)
	const entries = Object.entries(store)
		.sort((a, b) => b[1].updated - a[1].updated)
		.slice(0, MAX_VIDEOS);

	store = Object.fromEntries(entries);

	saveProgressStore(store);
};

const removeVideoProgress = (videoId) => {
	const store = getProgressStore();
	delete store[videoId];
	saveProgressStore(store);
};

const getVideoProgress = (videoId) => {
	const store = getProgressStore();
	return store[videoId]?.time || null;
};

// When playerRef/isPlaying/onPlay etc. are provided the component is in
// controlled mode (Watch Together). Internal progress tracking and the resume
// prompt are disabled in that mode.
const VideoPlayer = ({
    id = null,
    video_url,
    subtitles = [],
    // Controlled-mode props (Watch Together host / client)
    playerRef: externalRef = null,
    isPlaying: externalIsPlaying = null,
    playbackRate = 1,
    controls = true,
    volume,
    muted,
    onPlay: externalOnPlay = null,
    onPause: externalOnPause = null,
    onSeek: externalOnSeek = null,
    onReady: externalOnReady = null,
    onBuffer: externalOnBuffer = null,
    onBufferEnd: externalOnBufferEnd = null,
    onProgress: externalOnProgress = null,
    onEnded: externalOnEnded = null,
    onError: externalOnError = null,
}) => {
    const internalRef = useRef(null);
    const playerRef = externalRef || internalRef;
    const initialSaved = useRef();

    const isControlled = externalIsPlaying !== null;

    const [internalIsPlaying, setInternalIsPlaying] = useState(false);
    const [savedTime, setSavedTime] = useState(null);
    const [resumePrompt, setResumePrompt] = useState(false);

    const isPlaying = isControlled ? externalIsPlaying : internalIsPlaying;

    const tracks = useMemo(() => subtitles.map(sub => ({
        kind: 'subtitles',
        src: sub.subtitle,
        label: sub.name,
        srcLang: sub.srclng,
        default: sub.is_default,
    })), [subtitles]);

    // Load saved progress – only in uncontrolled (MoviePlayer) mode
    useEffect(() => {
        if (isControlled || !id) return;

        const saved = getVideoProgress(id);
        initialSaved.current = saved;
        let timeOut = null;

        if (saved && saved > 5) {
            setSavedTime(saved);
            setResumePrompt(true);
            timeOut = setTimeout(() => setResumePrompt(false), 10000);
        }

        return () => { if (timeOut) clearTimeout(timeOut); };
    }, [id, isControlled]);

    const handleProgress = (state) => {
        const { playedSeconds, played } = state;

        if (!isControlled && id) {
            if (initialSaved.current !== null && initialSaved.current < playedSeconds) {
                setResumePrompt(false);
                initialSaved.current = null;
            }
            if (played !== 0) {
                if (played > 0.95) {
                    removeVideoProgress(id);
                } else {
                    saveVideoProgress(id, playedSeconds);
                }
            }
        }

        if (externalOnProgress) externalOnProgress(state);
    };

    const handlePlay = () => {
        if (!isControlled) setInternalIsPlaying(true);
        if (externalOnPlay) externalOnPlay();
    };

    const handlePause = () => {
        if (!isControlled) setInternalIsPlaying(false);
        if (externalOnPause) externalOnPause();
    };

    const handleEnded = () => {
        if (!isControlled && id) removeVideoProgress(id);
        if (externalOnEnded) externalOnEnded();
    };

    const handleResume = () => {
        if (playerRef.current && savedTime) {
            playerRef.current.seekTo(savedTime, "seconds");
        }
        setInternalIsPlaying(true);
        setResumePrompt(false);
    };

    return (
        <div className="videoplayer position-relative">

            {!isControlled && resumePrompt && (
                <div
                    style={{
                        position: "absolute",
                        width: "100%",
                        background: "rgba(0,0,0,0.75)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexDirection: "row",
                        zIndex: 10,
                        color: "#fff",
                        paddingInline: "20px",
                        paddingBlock: "10px",
                        gap: "20px"
                    }}
                >
                    <p style={{ marginBottom: "0px" }}>
                        Continue watching from <b>{formatTime(savedTime)}</b>?
                    </p>
                    <button
                        onClick={handleResume}
                        style={{
                            background: "transparent",
                            border: "1px solid var(--primary-color)",
                            borderRadius: "8px",
                        }}
                    >
                        Continue
                    </button>
                </div>
            )}

            <ReactPlayer
                ref={playerRef}
                playing={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                {...(externalOnSeek ? { onSeek: externalOnSeek } : {})}
                {...(externalOnReady ? { onReady: externalOnReady } : {})}
                {...(externalOnBuffer ? { onBuffer: externalOnBuffer } : {})}
                {...(externalOnBufferEnd ? { onBufferEnd: externalOnBufferEnd } : {})}
                {...(externalOnError ? { onError: externalOnError } : {})}
                {...(volume !== undefined ? { volume } : {})}
                {...(muted !== undefined ? { muted } : {})}
                width="100%"
                height="100%"
                url={video_url}
                controls={controls}
                playbackRate={playbackRate}
                progressInterval={500}
                onProgress={handleProgress}
                onEnded={handleEnded}
                config={{
                    file: {
                        tracks,
                        attributes: {
                            crossOrigin: "anonymous"
                        }
                    }
                }}
            />
        </div>
    );
};

export default VideoPlayer;