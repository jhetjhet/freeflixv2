import React, { useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

// When playerRef/isPlaying/onPlay etc. are provided the component is in
// controlled mode (Watch Together). Progress tracking is handled externally.
const VideoPlayer = ({
    video_url,
    subtitles = [],
    progressInterval = 500,
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
    onDuration: externalOnDuration = null,
    onEnded: externalOnEnded = null,
    onError: externalOnError = null,
}) => {
    const internalRef = useRef(null);
    const playerRef = externalRef || internalRef;

    const isControlled = externalIsPlaying !== null;

    const [internalIsPlaying, setInternalIsPlaying] = useState(false);

    const isPlaying = isControlled ? externalIsPlaying : internalIsPlaying;

    const tracks = useMemo(() => subtitles
        .filter(sub => sub.subtitle_exists)
        .map(sub => ({
            kind: 'subtitles',
            src: sub.subtitle,
            label: sub.name,
            srcLang: sub.srclng,
            default: sub.is_default,
        })), [subtitles]);

    const handlePlay = () => {
        if (!isControlled) setInternalIsPlaying(true);
        if (externalOnPlay) externalOnPlay();
    };

    const handlePause = () => {
        if (!isControlled) setInternalIsPlaying(false);
        if (externalOnPause) externalOnPause();
    };

    const handleProgress = (state) => {
        if (externalOnProgress) externalOnProgress(state);
    };

    const handleEnded = () => {
        if (externalOnEnded) externalOnEnded();
    };

    return (
        <div className="videoplayer position-relative">
            <ReactPlayer
                ref={playerRef}
                playing={isPlaying}
                onPlay={handlePlay}
                onPause={handlePause}
                {...(externalOnSeek ? { onSeek: externalOnSeek } : {})}
                {...(externalOnReady ? { onReady: externalOnReady } : {})}
                {...(externalOnBuffer ? { onBuffer: externalOnBuffer } : {})}
                {...(externalOnBufferEnd ? { onBufferEnd: externalOnBufferEnd } : {})}
                {...(externalOnDuration ? { onDuration: externalOnDuration } : {})}
                {...(externalOnError ? { onError: externalOnError } : {})}
                {...(volume !== undefined ? { volume } : {})}
                {...(muted !== undefined ? { muted } : {})}
                width="100%"
                height="100%"
                url={video_url}
                controls={controls}
                playbackRate={playbackRate}
                progressInterval={progressInterval}
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