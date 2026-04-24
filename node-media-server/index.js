require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { Upload, UploadPart } = require('./database/models');
const uploadRouter = require('./routes/upload');
const { createWatchTogetherRouter, registerWatchTogetherHandlers } = require('./watch-together');
const { wtcHandlers } = require('./wtc-handlers');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.use(morgan('dev'));
app.use(cors({origin: '*'}));
app.use(express.json());

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
app.use('/watch-together', createWatchTogetherRouter());

const wtcIO = io.of('/wtc');

registerWatchTogetherHandlers(io);
wtcHandlers(wtcIO);

const startServer = async () => {
    // Both tables are ephemeral: upload_parts holds in-flight S3 part ETags,
    // uploads tracks resumption state. After a restart parts are gone so
    // resumption is impossible anyway. force:true guarantees the schema is
    // always correct regardless of any corruption left by a previous alter:true.
    // Drop child table first to avoid FK constraint error, then parent.
    await UploadPart.sync({ force: true });
    await Upload.sync({ force: true });

    server.listen(PORT, () => {
        console.log('Server running...', PORT);
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});