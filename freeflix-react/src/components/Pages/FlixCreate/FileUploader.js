import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import cookie from 'react-cookies';

const stringToHash = (str) => {
    var hash, chr;
    for (var i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

const FileUploader = forwardRef(({
    _file,
    children,
    cookieNameId = '',
    tmdbId = '',
    seasonNumber = null,
    episodeNumber = null,
    onFinish = () => { },
    chunkSize = (1048576 * 3),
    basePath = process.env.REACT_APP_NODE_API_URL,
}, ref) => {
    // upload
    const [bytesUploaded, setBytesUploaded] = useState(null);
    const [chunkID, setChunkID] = useState(undefined);
    const [cookieName, setCookieName] = useState(undefined);
    const [file, setFile] = useState(null);
    const [cancelTokenSource, setCancelTokenSource] = useState(null);

    // state
    const [pause, setPause] = useState(true);
    const [percentProgress, setPercentProgress] = useState(0);

    const init = async (file) => {
        var rawCookieName = `${file.name}-${file.lastModified}-${file.size}${cookieNameId ? `-${cookieNameId}` : ''}`;
        var cookieName = stringToHash(rawCookieName);
        var chunkid = cookie.load(cookieName);
        var respUploaded = 0;

        if (!chunkid) {
            chunkid = uuidv4();
            cookie.save(cookieName, chunkid);
        }

        try {
            const resp = await axios.get(`${basePath}/upload/${chunkid}/`);
            respUploaded = resp.data.uploaded;
        } catch (error) {
            console.error(error);
        }

        setChunkID(chunkid);
        setCookieName(cookieName);
        setBytesUploaded(respUploaded);
    }

    const prepareChunk = useCallback((file, chunkID) => {
        const totalFileSize = file.size;
        const remainSize = totalFileSize - bytesUploaded;
        const start = totalFileSize - remainSize;
        const end = start + Math.min(chunkSize, remainSize);
        uploadChunk(file, chunkID, start, end, remainSize, totalFileSize);
    }, [bytesUploaded, chunkSize, chunkID]);

    const uploadChunk = useCallback((file, chunkID, start, end, remainSize, total) => {
        const chunk = file.slice(start, end);
        var form = new FormData();
        form.append("filename", file.name);
        form.append("chunk", chunk);

        let url = `${basePath}/upload/`;

        if (remainSize <= 0) {
            form.append("tmdb_id", tmdbId);

            if (seasonNumber && episodeNumber) {
                form.append("season_number", seasonNumber);
                form.append("episode_number", episodeNumber);
            }

            url += 'complete/';
        }

        url += `${chunkID}/`;

        const source = axios.CancelToken.source();
        setCancelTokenSource(source);

        if (chunkID) {
            axios.post(url, form, {
                cancelToken: source.token,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${total}`,
                    'content-type': 'multipart/form-data',
                }
            }).then((resp) => {
                setBytesUploaded(resp.data.uploaded);
                if (resp.data.uploaded === file.size)
                    finish();
            }).catch((err) => {
                console.error(err);
                setPause(true);
            });
        }
    }, [chunkID]);

    const cancelUpload = useCallback(() => {
        if (chunkID && bytesUploaded > 0) {
            if (cancelTokenSource)
                cancelTokenSource.cancel(`${chunkID} file upload canceled.`);
            finish();
            axios.delete(`${basePath}/upload/cancel/${chunkID}/`).then((resp) => {
                finish();
            }).catch(err => {
                console.error(err);
            }).finally(() => {
                setBytesUploaded(null);
                setChunkID(null);
                setPercentProgress(0);
            });
        }
    }, [chunkID, bytesUploaded, cancelTokenSource, basePath]);

    const finish = () => {
        cookie.remove(cookieName);
        setFile(null);
        setPause(true);
        setBytesUploaded(null);
        onFinish();
    }

    useImperativeHandle(ref, () => ({
        setPause,
        cancelUpload() {
            cancelUpload();
        },
    }));

    useEffect(() => {
        if (!_file) {
            return;
        }

        setFile(_file);
        init(_file);
    }, [_file, cookieNameId]);

    useEffect(() => {
        if (!file || !bytesUploaded) {
            setPercentProgress(0);
            return;
        }

        setPercentProgress(Math.round((bytesUploaded / file.size) * 100));
    }, [bytesUploaded, file]);

    useEffect(() => {
        if (!file || pause || !chunkID || bytesUploaded === null) {
            return;
        }

        prepareChunk(file, chunkID);
    }, [bytesUploaded, pause, file, chunkID, prepareChunk]);

    return children({ bytesUploaded, pause, percentProgress });
});

export default FileUploader;