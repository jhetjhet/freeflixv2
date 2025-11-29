import React, { useMemo, useState } from "react";
import {
    Button,
} from 'react-bootstrap';
import axios from 'axios';
import ISO6391 from 'iso-639-1';

const FlixSubtitles = ({
    initial_subtitles = [],
    media_base_url = "",
}) => {
    const [subtitles, setSubtitles] = useState(initial_subtitles);

    const fileInputRefs = useMemo(() => {
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
                <div key={idx} className="mt-2">
                    <div className="d-flex align-items-center">
                        <input
                            type="checkbox"
                            className="mr-2"
                            checked={!!sub.is_default}
                            onChange={e => {
                                updateFieldSub("is_default", e.target.checked, idx);
                            }}
                        />
                        <input
                            type="text"
                            className="form-control mr-2 w-100"
                            placeholder="Subtitle name"
                            value={sub.name}
                            onChange={e => {
                                updateFieldSub("name", e.target.value, idx);
                            }}
                        />
                        <input
                            type="file"
                            accept=".vtt"
                            hidden
                            style={{ display: 'none' }}
                            ref={fileInputRefs[idx]}
                            onChange={e => {
                                updateFieldSub("__subtitle", e.target.files[0], idx);
                            }}
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

                    <div className="d-flex justify-content-end mt-2 pr-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="mr-2"
                            style={{
                                maxWidth: '100px',
                                flexShrink: 0,
                                textOverflow: 'ellipsis',
                                textWrap: 'nowrap',
                                overflow: 'hidden'
                            }}
                            onClick={() => fileInputRefs[idx]?.current?.click()}
                        >
                            {sub?.subtitle_url || sub?.__subtitle?.name || "Select SRT"}
                        </Button>

                        <Button
                            size="sm"
                            disabled={(!sub?.__subtitle && !sub?.subtitle_url) || !sub.name || sub?.__is_loading}
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
                                disabled={sub?.__is_loading}
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