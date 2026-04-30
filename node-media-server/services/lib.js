

const getBearerToken = (value = '') => {
	if (!value.startsWith('Bearer ')) {
		return null;
	}

	return value.slice(7);
};

const createRoomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const buildSyncPayload = (roomId, time, isPlaying, extra = {}) => ({
	roomId,
	time,
	isPlaying,
	serverTime: Number(extra.serverTime) || Date.now(),
	...extra,
});

function parseCookies(cookieHeader) {
    const cookies = {};
    
    if (!cookieHeader) return cookies;

    cookieHeader.split(";").forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        cookies[key] = decodeURIComponent(value);
    });

    return cookies;
}

module.exports = {
    getBearerToken,
    createRoomId,
    buildSyncPayload,
    parseCookies,
};