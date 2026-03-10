import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const refreshIntervalRef = useRef(null);

    // Configure axios defaults
    useEffect(() => {
        if (accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [accessToken]);

    // Fetch current user info
    const fetchUser = useCallback(async () => {
        if (!accessToken) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.get('/auth/users/me/');
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            // Token might be invalid, try refresh
            if (refreshToken) {
                await refreshAccessToken();
            } else {
                logout();
            }
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, refreshToken]);

    // Refresh access token
    const refreshAccessToken = useCallback(async () => {
        const storedRefreshToken = localStorage.getItem('refresh_token');
        if (!storedRefreshToken) {
            logout();
            return false;
        }

        try {
            const response = await axios.post('/auth/jwt/refresh/', {
                refresh: storedRefreshToken
            });

            const newAccessToken = response.data.access;
            setAccessToken(newAccessToken);
            localStorage.setItem('access_token', newAccessToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
            return false;
        }
    }, []);

    // Setup automatic token refresh (every 25 minutes for 30min token)
    useEffect(() => {
        if (accessToken && refreshToken) {
            // Clear any existing interval
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }

            // Refresh token every 25 minutes (assuming 30 min expiry)
            refreshIntervalRef.current = setInterval(() => {
                refreshAccessToken();
            }, 25 * 60 * 1000);
        }

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [accessToken, refreshToken, refreshAccessToken]);

    // Fetch user on mount or when access token changes
    useEffect(() => {
        fetchUser();
    }, []);

    // Login function
    const login = async (username, password) => {
        try {
            const response = await axios.post('/auth/jwt/create/', {
                username,
                password
            });

            const { access, refresh } = response.data;
            
            setAccessToken(access);
            setRefreshToken(refresh);
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            
            // Fetch user data after successful login
            const userResponse = await axios.get('/auth/users/me/');
            setUser(userResponse.data);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            console.error('Login failed:', error);
            return { 
                success: false, 
                error: error.response?.data || 'Login failed. Please check your credentials.' 
            };
        }
    };

    // Register function
    const register = async (username, email, password) => {
        try {
            await axios.post('/auth/users/', {
                username,
                email,
                password
            });

            // Auto-login after registration
            return await login(username, password);
        } catch (error) {
            console.error('Registration failed:', error);
            return { 
                success: false, 
                error: error.response?.data || 'Registration failed. Please try again.' 
            };
        }
    };

    // Logout function
    const logout = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
        
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }
    }, []);

    const value = {
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshAccessToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
