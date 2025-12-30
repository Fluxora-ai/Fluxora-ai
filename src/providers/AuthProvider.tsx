'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    token: string | null;
    setToken: (token: string | null) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Initialize token synchronously from localStorage to avoid setState in effects
    const [token, setTokenState] = useState<string | null>(() => {
        try {
            return localStorage.getItem('token');
        } catch (e) {
            return null;
        }
    });
    const [isLoading] = useState(false);
    const router = useRouter();

    // No effect required: token is initialized synchronously above.

    const setToken = (newToken: string | null) => {
        // Persist token to localStorage for client-only state. For better security,
        // consider storing auth tokens in HttpOnly cookies from the server so JS cannot read them.
        try {
            if (newToken) {
                localStorage.setItem('token', newToken);
            } else {
                localStorage.removeItem('token');
            }
        } catch (e) {
            console.warn('Failed to persist token to localStorage', e);
        }
        setTokenState(newToken);
    };

    const logout = () => {
        setToken(null);
        router.push('/login');
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, setToken, logout, isAuthenticated, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
