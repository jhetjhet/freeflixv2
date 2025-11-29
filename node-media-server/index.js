require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Chunk = require('./database/models/Chunk');
const uploadRouter = require('./routes/upload');
const axios = require('axios');

Chunk.sync({ alter: true });

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({origin: '*'}));

app.get('/', (req, res) => {
    res.send('Welcome to Node Media Servereee').end();
});

app.get('/flix-test/:tmdb_id', async (req, res) => {
    try {
        const { tmdb_id } = req.params;
        // Perform actions with the tmdb_id

        const response = await axios.get(`${process.env.DJANGO_URL_PATH}/api/movie/${tmdb_id}/`);

        return res.send(response.data).end();
    } catch (error) {
        console.error('Error in /flix-test:', error);
        return res.status(404).send('Not Found').end();
    }
});

app.use('/upload', uploadRouter);

app.listen(PORT, () => {
    console.log('Server running...', PORT);
});