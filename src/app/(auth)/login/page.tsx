'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login as loginService, getValidSession } from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check token khi vào trang login - nếu còn hạn thì redirect về dashboard
  useEffect(() => {
    const session = getValidSession();
    if (session) {
      router.replace('/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get('username') as string;
    const password = formData.get('password') as string;

    setLoading(true);

    try {
      const result = await loginService({ email, password, rememberMe: false });

      if (result.raw.data.requiresVerification) {
        if (typeof window !== 'undefined') {
          if (result.raw.data.pendingToken) {
            localStorage.setItem('pending_token', result.raw.data.pendingToken);
          }
          localStorage.setItem('pending_email', email);
        }
        router.push('/verify-email');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị loading khi đang check token
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-sm font-medium text-gray-500">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Header / Branding */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-4">
            <span className="material-symbols-outlined text-4xl text-blue-600">inventory_2</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">WMS Login</h1>
          <p className="text-blue-100 text-sm mt-1">Warehouse Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">person</span>
              <input
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                id="username"
                name="username"
                placeholder="Enter username..."
                type="text"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-gray-700" htmlFor="password">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">lock</span>
              <input
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                id="password"
                name="password"
                placeholder="Enter password..."
                type="password"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Secure Login'}
              <span className="material-symbols-outlined text-sm">
                {loading ? 'hourglass_top' : 'login'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}