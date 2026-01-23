'use client';

import React, { createContext, useContext, useState } from 'react';

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
