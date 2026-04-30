const { verifyToken, fetchMovie } = require('../services/flix-api');
const { createRoomId, getBearerToken } = require('../services/lib');
const { getRoom, saveRoom } = require('../services/wt-redis');

const router = require('express').Router();

// Internal route for service-to-service calls (e.g. Django share view).
// Authenticated by NODE_SERVICE_TOKEN header instead of user JWT.
router.get('/internal/:roomId', async (req, res) => {
    const serviceToken = process.env.NODE_SERVICE_TOKEN || '';
    const provided = (req.headers['x-service-token'] || '');
    if (!serviceToken || provided !== serviceToken) {
        return res.status(403).json({ detail: 'Forbidden.' });
    }
    const room = await getRoom(req.params.roomId);
    if (!room) {
        return res.status(404).json({ detail: 'Not found.' });
    }
    return res.json({ roomId: room.roomId, movieId: room.movieId });
});

router.post('/create/:movieId', async (req, res) => {
    const token = getBearerToken(req.headers.authorization || '');
    const user = await verifyToken(token);

    if (!user) {
        return res.status(404).json({ detail: 'Not found.' });
    }

    try {
        const resp = await fetchMovie(req.params.movieId);
    } catch (error) {
        return res.status(404).json({ detail: 'Not found.' });
    }

    const roomId = createRoomId();
    await saveRoom({
        roomId,
        movieId: req.params.movieId,
        hostUserId: user.id,
        hostSocketId: null,
        hostDisconnectedAt: null,
        currentTime: 0,
        isPlaying: false,
        updatedAt: Date.now(),
    });

    return res.json({
        roomId,
        movieId: req.params.movieId,
        invitePath: `/watch-together/${roomId}`,
    });
});

router.get('/:roomId', async (req, res) => {
    const token = getBearerToken(req.headers.authorization || '');
    const isServiceToken = token === process.env.NODE_SERVICE_TOKEN;

    let user = null;

    if (!isServiceToken) {
        user = await verifyToken(token);

        if (!user) {
            return res.status(404).json({ detail: 'Not found.' });
        }
    }


    const room = await getRoom(req.params.roomId);
    if (!room) {
        return res.status(404).json({ detail: 'Not found.' });
    }

    return res.json({
        roomId: room.roomId,
        movieId: room.movieId,
        isHost: room.hostUserId === user?.id,
        hasActiveHost: Boolean(room.hostSocketId),
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        syncInterval: Number(process.env.WATCH_TOGETHER_SYNC_INTERVAL || 4000),
    });
});

module.exports = router;