import React, { useMemo, useState } from "react";
import {
    Button,
} from 'react-bootstrap';
import axios from 'axios';
import ISO6391 from 'iso-639-1';

function convertSrtToVtt(srtContent) {
    // Convert SRT format to WebVTT format
    let vttContent = "WEBVTT\n\n";

    // Replace comma with dot in timestamps (SRT uses , for milliseconds, VTT uses .)
    const lines = srtContent.split('\n');
    let skipNextNumber = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip sequence numbers (numeric lines that come before timestamps)
        if (/^\d+$/.test(line)) {
            skipNextNumber = true;
            continue;
        }

        // Process timestamp lines
        if (line.includes('-->')) {
            const convertedLine = line.replace(/,/g, '.');
            vttContent += convertedLine + '\n';
            skipNextNumber = false;
        } else if (line.length > 0) {
            // Add subtitle text
            vttContent += line + '\n';
        } else if (!skipNextNumber) {
            // Add blank line separator
            vttContent += '\n';
        }
    }

    return vttContent;
};

const FlixSubtitles = ({
    initial_subtitles = [],
    media_base_url = "",
}) => {
    const [subtitles, setSubtitles] = useState(initial_subtitles);

    const fileInputRefs = useMemo(() => {
        return subtitles.map(() => React.createRef());
    }, [subtitles]);

    const srtFileInputRefs = useMemo(() => {
        return subtitles.map(() => React.createRef());
    }, [subtitles]);

    const mediaBaseUrl = media_base_url + "subtitles";

    const updateFieldSub = (field, value, idx) => {
        setSubtitles((prevSub) => {
            const newSubtitles = [...prevSub];

            if (newSubtitles[idx]) {
                newSubtitles[idx][field] = value;
            }

            return newSubtitles;
        });
    }

    const onRowDelete = (idx) => {
        const newSubtitles = subtitles.filter((_, index) => index !== idx);
        setSubtitles(newSubtitles);
    }

    const onSrtFileSelect = async (e, idx) => {
        const file = e.target.files[0];
        if (!file) return;

        updateFieldSub("__is_converting", true, idx);

        try {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const srtContent = event.target.result;
                    const vttContent = convertSrtToVtt(srtContent);

                    // Create a VTT file from the converted content
                    const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
                    const vttFile = new File(
                        [vttBlob],
                        file.name.replace(/\.srt$/i, '.vtt'),
                        { type: 'text/vtt' }
                    );

                    updateFieldSub("__subtitle", vttFile, idx);
                } catch (error) {
                    console.error("Error converting SRT to VTT:", error);
                    alert("Failed to convert SRT file. Please check the file format.");
                } finally {
                    updateFieldSub("__is_converting", false, idx);
                }
            };

            reader.onerror = () => {
                console.error("Error reading SRT file");
                alert("Failed to read SRT file.");
                updateFieldSub("__is_converting", false, idx);
            };

            reader.readAsText(file);
        } catch (error) {
            console.error("Error processing SRT file:", error);
            updateFieldSub("__is_converting", false, idx);
        }
    }

    const onSave = async (sub, idx) => {
        updateFieldSub("__is_loading", true, idx);

        const formData = new FormData();
        formData.append("subtitle", sub?.__subtitle);
        formData.append("name", sub?.name);
        formData.append("is_default", sub?.is_default);
        formData.append("srclng", sub?.srclng);

        try {
            const response = await axios.post(`${mediaBaseUrl}/`, formData);

            const newSubtitles = [...subtitles];
            newSubtitles[idx] = { ...response.data };
            setSubtitles(newSubtitles);
        } catch (error) {
            console.error("Error saving subtitle:", error);
        }

        updateFieldSub("__is_loading", false, idx);
    }

    const onUpdate = async (sub, idx) => {
        updateFieldSub("__is_loading", true, idx);

        const formData = new FormData();
        formData.append("name", sub?.name);
        formData.append("is_default", sub?.is_default);
        formData.append("srclng", sub?.srclng);

        if (sub?.__subtitle) {
            formData.append("subtitle", sub.__subtitle);
        }

        try {
            const response = await axios.patch(`${mediaBaseUrl}/${sub?.id}/`, formData);

            const newSubtitles = [...subtitles];
            newSubtitles[idx] = { ...response.data };
            setSubtitles(newSubtitles);
        } catch (error) {
            console.error("Error updating subtitle:", error);
        }

        updateFieldSub("__is_loading", false, idx);
    }

    const onDelete = async (idx) => {
        updateFieldSub("__is_loading", true, idx);

        try {
            const response = await axios.delete(`${mediaBaseUrl}/${subtitles[idx]?.id}/`);

            onRowDelete(idx);
        } catch (error) {
            console.error("Error deleting subtitle:", error);
        }

        updateFieldSub("__is_loading", false, idx);
    }

    return (
        <div className="subtitle-list-form mb-3">
            {subtitles.map((sub, idx) => (
                <div key={idx} className="mt-2 mb-3">
                    <div className="d-flex align-items-center">
                        <input
                            type="checkbox"
                            className="mr-2"
                            checked={!!sub.is_default}
                            onChange={e => {
                                updateFieldSub("is_default", e.target.checked, idx);
                            }}
                        />
                        <div className="w-100 mr-2">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Subtitle name"
                                value={sub.name}
                                onChange={e => {
                                    updateFieldSub("name", e.target.value, idx);
                                }}
                            />
                        </div>
                        <input
                            type="file"
                            accept=".vtt"
                            hidden
                            style={{ display: 'none' }}
                            ref={fileInputRefs[idx]}
                            disabled={sub?.__is_converting}
                            onChange={e => {
                                updateFieldSub("__subtitle", e.target.files[0], idx);
                            }}
                        />

                        <input
                            type="file"
                            accept=".srt"
                            hidden
                            style={{ display: 'none' }}
                            ref={srtFileInputRefs[idx]}
                            disabled={sub?.__is_converting}
                            onChange={e => onSrtFileSelect(e, idx)}
                        />

                        <select
                            className="form-control mr-2"
                            style={{ maxWidth: '100px', flexShrink: 0 }}
                            value={sub.srclng || 'en'}
                            onChange={e => {
                                updateFieldSub("srclng", e.target.value, idx);
                            }}
                        >
                            {ISO6391.getAllCodes().map(code => (
                                <option key={code} value={code}>
                                    {code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {sub.subtitle_url && (
                        <small className="text-muted d-block mt-1 pl-4" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                            {sub.subtitle_url}
                        </small>
                    )}

                    <div className="d-flex justify-content-end mt-2 pr-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="mr-2"
                            disabled={sub?.__is_converting}
                            onClick={() => fileInputRefs[idx]?.current?.click()}
                        >
                            {sub?.__is_converting ? "Converting..." : "Upload VTT"}
                        </Button>

                        <Button
                            size="sm"
                            variant="info"
                            className="mr-2"
                            disabled={sub?.__is_converting}
                            onClick={() => srtFileInputRefs[idx]?.current?.click()}
                        >
                            {sub?.__is_converting ? "Converting..." : "Upload SRT"}
                        </Button>

                        <Button
                            size="sm"
                            disabled={(!sub?.__subtitle && !sub?.subtitle_url) || !sub.name || sub?.__is_loading || sub?.__is_converting}
                            variant="success"
                            className="mr-2"
                            onClick={() => {
                                if (sub?.id) {
                                    onUpdate(sub, idx);
                                } else {
                                    onSave(sub, idx);
                                }
                            }}
                        >
                            {sub?.id ? "Update" : "Save"}
                        </Button>

                        {sub?.id && (
                            <Button
                                disabled={sub?.__is_loading || sub?.__is_converting}
                                size="sm"
                                variant="danger"
                                onClick={() => onDelete(idx)}
                            >
                                Delete
                            </Button>
                        )}

                        {!sub?.id && (
                            <Button
                                size="sm"
                                variant="danger"
                                disabled={sub?.__is_converting}
                                onClick={() => onRowDelete(idx)}
                            >
                                X
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            <Button
                size="sm"
                variant="primary"
                onClick={() => {
                    const newSubtitles = [...subtitles, { name: '', subtitle: null, is_default: false, srclng: 'en' }];
                    setSubtitles(newSubtitles);
                }}
            >
                Add Subtitle
            </Button>
        </div>
    );
}

export default FlixSubtitles;