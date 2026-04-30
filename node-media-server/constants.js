
const HOST_RECONNECT_GRACE_MS = Number(process.env.WATCH_TOGETHER_HOST_RECONNECT_GRACE_MS || (1000 * 120));

module.exports = Object.freeze({
    HOST_RECONNECT_GRACE_MS,
});