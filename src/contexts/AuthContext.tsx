'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * Kiểu User dùng chung toàn hệ thống
 * (đủ cho demo + phân quyền)
 */
export type User = {
  id: string;
  name: string;
  role: 'ADMIN' | 'WAREHOUSE_MANAGER' | 'WAREHOUSE_KEEPER';
};

/**
 * Kiểu dữ liệu context
 */
type AuthContextType = {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
};

/**
 * Tạo AuthContext
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider bọc các trang cần auth
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lưu user trong state (KHÔNG dùng token)
  const [user, setUser] = useState<User | null>(null);

  /**
   * Gọi sau khi login thành công
   */
  const login = (userData: User) => {
    setUser(userData);
  };

  /**
   * Logout: xoá user khỏi context
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
 * Custom hook dùng AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
