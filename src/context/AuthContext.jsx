import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, attendanceAPI } from '../api/api';
import {
    clearAuthTokens,
    clearStoredUser,
    getAccessToken,
    getStoredUser,
    setAccessToken,
    setRefreshToken,
    setStoredUser,
} from '../lib/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const hydrateAuth = async () => {
            const token = await getAccessToken();

            if (!active) {
                return;
            }

            if (!token) {
                clearStoredUser();
                setUser(null);
                setLoading(false);
                return;
            }

            if (user) {
                setLoading(false);
                return;
            }

            try {
                const res = await authAPI.getMeInit();
                const { user: profile, unread_notifications, stats } = res.data;
                const userData = { ...profile, id: profile.id ?? profile.pk, init_data: { unread_notifications, stats } };

                if (!active) {
                    return;
                }

                setUser(userData);
                setStoredUser(userData);
            } catch {
                await clearAuthTokens();
                clearStoredUser();

                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        hydrateAuth();

        return () => {
            active = false;
        };
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { access, refresh, role, name, id, organization_name } = res.data;
        await setAccessToken(access);
        await setRefreshToken(refresh);
        const userData = { id, email, role, name, organization_name };
        setStoredUser(userData);
        setUser(userData);
        return userData;
    };

    const logout = async () => {
        try {
            const token = await getAccessToken();
            if (token) {
                await attendanceAPI.logout();
            }
        } catch (e) { /* ignore */ }
        await clearAuthTokens();
        clearStoredUser();
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await authAPI.getMeInit();
            const { user: profile, unread_notifications, stats } = res.data;
            const userData = { ...profile, id: profile.id ?? profile.pk, init_data: { unread_notifications, stats } };
            setUser(userData);
            setStoredUser(userData);
        } catch { /* ignore */ }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
