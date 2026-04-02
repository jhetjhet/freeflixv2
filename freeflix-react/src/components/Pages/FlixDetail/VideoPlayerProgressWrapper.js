import React, { useRef, useCallback, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import useMediaProgress from '../../../helpers/progress/useMediaProgress';

// How often ReactPlayer fires onProgress while playing (drives save frequency).
// No manual throttling needed – the interval itself controls update rate.
const PROGRESS_INTERVAL_MS = 10_000;

// Minimum position change (seconds) since last save to consider a progress
// update meaningful. Prevents redundant writes during slow playback.
const MIN_DELTA = 8;

// Minimum absolute difference (seconds) between seek target and last saved
// position required to trigger an update on seek.
const PROGRESS_SEEK_WINDOW = 5;

// Seconds remaining at video end to consider the content finished.
const FINISH_THRESHOLD = 30;

// Fraction of duration the user must pass before any tracking begins.
const MIN_PROGRESS_THRESHOLD = 0.05;

/**
 * Wraps VideoPlayer and owns all progress-persistence logic.
 * Uses useMediaProgress to send updates to the backend.
 */
const VideoPlayerProgressWrapper = ({ video_url, subtitles = [], mediaType, mediaId }) => {
    const { post } = useMediaProgress(mediaType, mediaId);

    const durationRef = useRef(0);
    const lastPositionRef = useRef(0);
    const lastSavedProgressRef = useRef(0);
    const isFinishedRef = useRef(false);

    // Always points to the latest save-on-exit logic without recreating the
    // beforeunload listener on every render.
    const saveOnExitRef = useRef(null);

    const sendProgress = useCallback((position, finished) => {
        if (durationRef.current <= 0) return;
        if (position < MIN_PROGRESS_THRESHOLD * durationRef.current) return;

        // Skip exact duplicate
        if (
            position === lastSavedProgressRef.current &&
            finished === isFinishedRef.current
        ) return;

        lastSavedProgressRef.current = position;
        isFinishedRef.current = finished;

        post({
            last_position_seconds: position,
            duration_seconds: durationRef.current,
            progress_seconds: position,
            is_finished: finished,
        });
    }, [post]);

    const handleDuration = useCallback((duration) => {
        durationRef.current = duration;
    }, []);

    const handleProgress = useCallback(({ playedSeconds }) => {
        lastPositionRef.current = playedSeconds;

        // Restart detection: user was near end and jumped back to beginning
        if (
            lastSavedProgressRef.current > 0.80 * durationRef.current &&
            playedSeconds < 0.05 * durationRef.current
        ) {
            lastSavedProgressRef.current = 0;
            isFinishedRef.current = false;
            return;
        }

        if (Math.abs(playedSeconds - lastSavedProgressRef.current) <= MIN_DELTA) return;

        sendProgress(playedSeconds, false);
    }, [sendProgress]);

    const handleSeek = useCallback((seconds) => {
        lastPositionRef.current = seconds;

        if (Math.abs(seconds - lastSavedProgressRef.current) > PROGRESS_SEEK_WINDOW) {
            sendProgress(seconds, false);
        }
    }, [sendProgress]);

    // Always save on pause – gives accurate last-position even without a recent
    // progress tick.
    const handlePause = useCallback(() => {
        sendProgress(lastPositionRef.current, false);
    }, [sendProgress]);

    const handleEnded = useCallback(() => {
        const remaining = durationRef.current - lastPositionRef.current;
        const finished = durationRef.current > 0 && remaining < FINISH_THRESHOLD;
        sendProgress(lastPositionRef.current, finished);
    }, [sendProgress]);

    // Keep the ref up-to-date on every render so the event listener and the
    // useEffect cleanup always call the latest version.
    saveOnExitRef.current = () => {
        const position = lastPositionRef.current;
        if (durationRef.current <= 0) return;
        if (position < MIN_PROGRESS_THRESHOLD * durationRef.current) return;
        if (position === lastSavedProgressRef.current) return; // already saved

        const token = localStorage.getItem('access_token');
        if (!token || !mediaId) return;

        // fetch + keepalive survives both SPA unmount and actual tab/window close
        fetch('/api/progress/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                media_type: mediaType,
                media_id: String(mediaId),
                last_position_seconds: position,
                duration_seconds: durationRef.current,
                progress_seconds: position,
                is_finished: isFinishedRef.current,
            }),
            keepalive: true,
        }).catch(() => {});
    };

    useEffect(() => {
        const handleBeforeUnload = () => { if (saveOnExitRef.current) saveOnExitRef.current(); };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (saveOnExitRef.current) saveOnExitRef.current();
        };
    }, []); // runs once; uses ref to always reach the latest closure values

    return (
        <VideoPlayer
            video_url={video_url}
            subtitles={subtitles}
            progressInterval={PROGRESS_INTERVAL_MS}
            onDuration={handleDuration}
            onProgress={handleProgress}
            onSeek={handleSeek}
            onPause={handlePause}
            onEnded={handleEnded}
        />
    );
};

export default VideoPlayerProgressWrapper;
