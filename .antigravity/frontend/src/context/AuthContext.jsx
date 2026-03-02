import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [username, setUsername] = useState(localStorage.getItem('auth_user'));
    const [isAdmin, setIsAdmin] = useState(localStorage.getItem('auth_is_admin') === 'true');

    useEffect(() => {
        if (token) localStorage.setItem('auth_token', token);
        else localStorage.removeItem('auth_token');

        if (username) localStorage.setItem('auth_user', username);
        else localStorage.removeItem('auth_user');

        if (isAdmin) localStorage.setItem('auth_is_admin', 'true');
        else localStorage.removeItem('auth_is_admin');
    }, [token, username, isAdmin]);

    const login = (newToken, newUsername, newIsAdmin = false) => {
        setToken(newToken);
        setUsername(newUsername);
        setIsAdmin(newIsAdmin);
    };

    const logout = () => {
        setToken(null);
        setUsername(null);
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ token, username, isAdmin, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
