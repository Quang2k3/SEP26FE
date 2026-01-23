'use client';

import React, { createContext, useContext, useState } from 'react';
import { useEffect } from 'react';
import { getToken, removeToken } from '@/utils/token';

/**
 * Kiểu dữ liệu user (tối giản cho login)
 */
interface User {
    id: string;
    username: string;
    role: string;
}

/**
 * Kiểu context auth
 */
interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
}

// Tạo context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider
 * - Bọc toàn app
 * - Quản lý state đăng nhập
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    // Khi reload page, nếu còn token thì coi như đã login
    useEffect(() => {
        const token = getToken();

        if (token) {
            // Tạm mock user, STEP SAU sẽ lấy từ API / decode token
            setUser({
                id: '1',
                username: 'admin',
                role: 'admin',
            });
        }
    }, []);
    /**
     * Lưu user sau khi login
     */
    const login = (userData: User) => {
        setUser(userData);
    };

    /**
     * Clear user khi logout
     */
    const logout = () => {
        removeToken();
        setUser(null);
    };


    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook dùng auth
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}

