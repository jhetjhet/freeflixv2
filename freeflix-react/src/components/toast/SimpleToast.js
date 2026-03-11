import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import './SimpleToast.css';

const TOAST_TITLES = {
    error: 'Request Failed',
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
};

const SimpleToast = ({
    show,
    type,
    title,
    message,
    duration = 4000,
    onClose,
}) => {
    useEffect(() => {
        if (!show || !message) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            onClose();
        }, duration);

        return () => window.clearTimeout(timeoutId);
    }, [duration, message, onClose, show]);

    if (!show || !message) {
        return null;
    }

    const resolvedTitle = title || TOAST_TITLES[type] || TOAST_TITLES.error;
    const toastClassName = `simple-toast__card simple-toast__card--${type}`;
    const toastHeaderClassName = `simple-toast__header simple-toast__header--${type}`;

    const toastContent = (
        <div className="simple-toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div className={toastClassName}>
                <div className={toastHeaderClassName}>
                    <strong className="simple-toast__title">{resolvedTitle}</strong>
                    <button type="button" className="simple-toast__close" aria-label="Close toast" onClick={onClose}>
                        x
                    </button>
                </div>
                <p className="simple-toast__message">{message}</p>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return toastContent;
    }

    return createPortal(toastContent, document.body);
};

SimpleToast.propTypes = {
    show: PropTypes.bool,
    type: PropTypes.oneOf(['error', 'info', 'success', 'warning']),
    title: PropTypes.string,
    message: PropTypes.string,
    duration: PropTypes.number,
    onClose: PropTypes.func,
};

SimpleToast.defaultProps = {
    show: false,
    type: 'error',
    title: '',
    message: '',
    duration: 4000,
    onClose: () => { },
};

export default SimpleToast;
