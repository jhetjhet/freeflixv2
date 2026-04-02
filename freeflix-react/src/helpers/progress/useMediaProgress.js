import { useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Low-level transport hook. Provides a `post` function that sends a progress
 * payload to the backend. All decision logic (when/what to send) lives in the
 * consuming component (e.g. VideoPlayerProgressWrapper).
 *
 * @param {string} mediaType - 'movie' | 'episode'
 * @param {string|number|null} mediaId - PK of the Movie or Episode
 */
const useMediaProgress = (mediaType, mediaId) => {
    const { isAuthenticated } = useAuth();

    const post = useCallback(async (payload) => {
        if (!isAuthenticated || !mediaId) return;

        try {
            await axios.post('/api/progress/', {
                media_type: mediaType,
                media_id: String(mediaId),
                ...payload,
            });
        } catch {
            // progress reporting is non-critical – fail silently
        }
    }, [isAuthenticated, mediaType, mediaId]);

    return { post };
};

export default useMediaProgress;
