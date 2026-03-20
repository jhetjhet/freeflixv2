import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
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
    chunkSize = (1048576 * 5),
    parallelism = 5,
    basePath = process.env.REACT_APP_NODE_API_URL,
}, ref) => {
    const [bytesUploaded, setBytesUploaded] = useState(null);
    const [chunkID, setChunkID] = useState(undefined);
    const [file, setFile] = useState(null);
    const [pause, setPause] = useState(true);
    const [percentProgress, setPercentProgress] = useState(0);
    const [isInitializing, setIsInitializing] = useState(false);

    // Refs used inside async callbacks to avoid stale closures.
    const cookieNameRef = useRef(undefined);
    const abortControllerRef = useRef(null);
    const isRunningRef = useRef(false);
    const resumeStateRef = useRef({ alreadyUploaded: 0, completedParts: [] });

    const init = async (file) => {
        setIsInitializing(true);
        try {
        const rawCookieName = `${file.name}-${file.lastModified}-${file.size}${cookieNameId ? `-${cookieNameId}` : ''}`;
        const cookieHash = stringToHash(rawCookieName);
        let chunkid = cookie.load(cookieHash);

        if (!chunkid) {
            chunkid = uuidv4();
            cookie.save(cookieHash, chunkid);
        }

        // Fetch existing upload state for resume.
        let alreadyUploaded = 0;
        let completedParts = [];
        try {
            const resp = await axios.get(`${basePath}/upload/${chunkid}/`);
            alreadyUploaded = resp.data.uploaded ?? 0;
            completedParts = resp.data.completedParts ?? [];
        } catch (error) {
            // No existing upload — start fresh.
        }

        cookieNameRef.current = cookieHash;
        resumeStateRef.current = { alreadyUploaded, completedParts };
        unstable_batchedUpdates(() => {
            setChunkID(chunkid);
            setBytesUploaded(alreadyUploaded);
            setIsInitializing(false);
        });
        } catch {
            setIsInitializing(false);
        }
    };

    const doFinish = () => {
        cookie.remove(cookieNameRef.current);
        setFile(null);
        setPause(true);
        setBytesUploaded(null);
        isRunningRef.current = false;
        onFinish();
    };

    const cancelUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    useImperativeHandle(ref, () => ({
        setPause,
        cancelUpload() {
            cancelUpload();
            const id = chunkID;
            doFinish();
            if (id) {
                axios.delete(`${basePath}/upload/cancel/${id}/`)
                    .catch(err => console.error(err))
                    .finally(() => {
                        setBytesUploaded(null);
                        setChunkID(null);
                        setPercentProgress(0);
                    });
            }
        },
    }));

    useEffect(() => {
        if (!_file) return;
        setFile(_file);
        init(_file);
    }, [_file, cookieNameId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!file || bytesUploaded === null) {
            setPercentProgress(0);
            return;
        }
        setPercentProgress(Math.round((bytesUploaded / file.size) * 100));
    }, [bytesUploaded, file]);

    // Main parallel upload effect. Fires when unpaused with all required state ready.
    // Uses a worker-pool pattern: `parallelism` concurrent workers share a chunk index
    // counter and each pick up the next unstarted chunk until the file is exhausted.
    // Idempotent server responses ensure correct behaviour on resume.
    useEffect(() => {
        if (!file || pause || !chunkID || bytesUploaded === null) return;
        if (isRunningRef.current) return;

        isRunningRef.current = true;

        // Controller is created synchronously so the cleanup return below can reference it.
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const { signal } = controller;

        (async () => {
            // Refresh resume state from the server before starting workers.
            // This ensures that parts uploaded before a same-session pause are
            // not re-sent, even though init() was not called again.
            try {
                const resp = await axios.get(`${basePath}/upload/${chunkID}/`);
                resumeStateRef.current = {
                    alreadyUploaded: resp.data.uploaded ?? 0,
                    completedParts: resp.data.completedParts ?? [],
                };
                setBytesUploaded(resumeStateRef.current.alreadyUploaded);
            } catch {
                // Server has no record yet (first start) — keep existing resumeStateRef.
            }

            if (signal.aborted) return;

            // Build the list of chunks still needing upload, skipping parts already
            // confirmed by the server so no bytes are re-sent over the network.
            const { alreadyUploaded, completedParts } = resumeStateRef.current;
            const completedPartSet = new Set(completedParts);

            const chunks = [];
            for (let start = 0; start < file.size; start += chunkSize) {
                const partNumber = Math.floor(start / chunkSize) + 1;
                if (!completedPartSet.has(partNumber)) {
                    chunks.push({ start, end: Math.min(start + chunkSize, file.size) });
                }
            }

            // Shared mutable index — safe because JS is single-threaded; `chunkIndex++`
            // executes synchronously before any await, so each worker gets a unique chunk.
            let chunkIndex = 0;
            let newBytesUploaded = alreadyUploaded;

            const uploadChunkWithRetry = async (chunk, maxRetries = 3) => {
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    const form = new FormData();
                    form.append('filename', file.name);
                    form.append('chunk', file.slice(chunk.start, chunk.end));

                    const source = axios.CancelToken.source();
                    const onAbort = () => source.cancel('cancelled');
                    signal.addEventListener('abort', onAbort, { once: true });

                    try {
                        await axios.post(
                            `${basePath}/upload/${chunkID}/`,
                            form,
                            {
                                cancelToken: source.token,
                                headers: {
                                    'Content-Range': `bytes ${chunk.start}-${chunk.end}/${file.size}`,
                                    'content-type': 'multipart/form-data',
                                },
                            },
                        );
                        return; // success
                    } catch (err) {
                        if (axios.isCancel(err) || attempt === maxRetries - 1) throw err;
                        // Exponential back-off: 500ms, 1000ms, 2000ms, ...
                        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
                    } finally {
                        signal.removeEventListener('abort', onAbort);
                    }
                }
            };

            const uploadWorker = async () => {
                while (!signal.aborted) {
                    const chunk = chunks[chunkIndex++];
                    if (!chunk) break;

                    await uploadChunkWithRetry(chunk);
                    newBytesUploaded += (chunk.end - chunk.start);
                    setBytesUploaded(newBytesUploaded);
                }
            };

            const workerCount = Math.min(parallelism, chunks.length);

            Promise.all(Array.from({ length: workerCount }, () => uploadWorker()))
                .then(async () => {
                    if (signal.aborted) return;
                    // All chunks uploaded — finalize the multipart upload on the server.
                    const body = { filename: file.name, tmdb_id: tmdbId };
                    if (seasonNumber && episodeNumber) {
                        body.season_number = seasonNumber;
                        body.episode_number = episodeNumber;
                    }
                    await axios.post(`${basePath}/upload/finalize/${chunkID}/`, body);
                    doFinish();
                })
                .catch(err => {
                    if (!axios.isCancel(err)) {
                        console.error(err);
                        setPause(true);
                    }
                })
                .finally(() => {
                    isRunningRef.current = false;
                });
        })();

        return () => {
            controller.abort();
        };
    }, [pause, file, chunkID]); // eslint-disable-line react-hooks/exhaustive-deps

    return children({ bytesUploaded, pause, percentProgress, isInitializing });
});

export default FileUploader;
