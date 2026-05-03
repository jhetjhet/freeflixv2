const axios = require('axios');

const trackers = process.env.P2P_TRACKERS ? process.env.P2P_TRACKERS.split(',') : [];

async function generateMovieMagnet(imdbId) {
    if (!imdbId || trackers.length === 0) {
        return null;
    }

    try {
        const response = await axios.get(process.env.P2P_MOVIE_DETAILS_API, { params: { imdb_id: imdbId } });

        if (response.status !== 200) {
            return null;
        }

        const data = response.data;
        const movie = data?.data?.movie;

        console.log(movie)

        if (!movie) {
            return null;
        }

        // highest seed
        const bestTorrent = movie.torrents.reduce((best, t) => {
            if (t.seeds > (best?.seeds || 0)) {
                return t;
            }
            return best;
        }, null);

        if (!bestTorrent || !bestTorrent.hash) {
            return null;
        }

        const urlParams = new URLSearchParams();

        trackers.forEach((tracker) => {
            urlParams.append('tr', tracker);
        });

        return `magnet:?xt=urn:btih:${bestTorrent.hash}&dn=${encodeURIComponent(movie.title)}&${urlParams.toString()}`;
    } catch (error) {
        console.error('Error generating magnet link:', error);
        return null;
    }
}

module.exports = {
    generateMovieMagnet,
    trackers,
};