import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';

const TMDBContext = createContext(null);

export const useTMDB = () => {
    const context = useContext(TMDBContext);
    if (!context) {
        throw new Error('useTMDB must be used within TMDBProvider');
    }
    return context;
};

export const TMDBProvider = ({ children }) => {
    const [tmdb, setTmdb] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // type: 'movie' | 'tv'
    const load = useCallback(async (id, type) => {
        setIsLoading(true);
        try {
            const conf = {
                params: {
                    api_key: process.env.REACT_APP_TMDB_API_KEY,
                    append_to_response: 'credits,images,reviews',
                },
            };
            const response = await axios.get(`https://api.themoviedb.org/3/${type}/${id}`, conf);
            setTmdb(response.data);
        } catch (error) {
            console.error('Failed to fetch TMDB data:', error);
            setTmdb(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = useCallback(() => {
        setTmdb(null);
    }, []);

    return (
        <TMDBContext.Provider value={{ tmdb, isLoading, load, clear }}>
            {children}
        </TMDBContext.Provider>
    );
};

export default TMDBContext;
