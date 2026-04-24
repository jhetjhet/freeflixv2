const axios = require('axios');

const getDjangoBaseUrl = () => {
    return process.env.DJANGO_BASE_URL || 'http://backend:8000';
};

const verifyToken = async (token) => {
    if (!token) {
        return null;
    }

    try {
        const response = await axios.get(`${getDjangoBaseUrl()}/auth/users/me/`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            timeout: 5000,
        });

        return response.data;
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
};

const fetchMovie = async (movieId) => {
    await axios.get(`${getDjangoBaseUrl()}/api/movie/${movieId}/`, {
        timeout: 5000,
    });
};

module.exports = {
    verifyToken,
    fetchMovie,
    getDjangoBaseUrl,
};