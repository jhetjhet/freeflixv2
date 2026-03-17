import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';

const FlixContext = createContext(null);

export const useFlix = () => {
    const context = useContext(FlixContext);
    if (!context) {
        throw new Error('useFlix must be used within FlixProvider');
    }
    return context;
};

export const FlixProvider = ({ children }) => {
    const [flix, setFlix] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // type: 'movie' | 'series'
    const load = useCallback(async (id, type) => {
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/${type}/${id}/`);
            setFlix(response.data);
        } catch (error) {
            console.error('Failed to fetch flix data:', error);
            setFlix(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setFlix(null);
    }, []);

    return (
        <FlixContext.Provider value={{ flix, isLoading, load, clear }}>
            {children}
        </FlixContext.Provider>
    );
};

export default FlixContext;
