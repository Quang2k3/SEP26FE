'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearAuthToken } from '@/services/authService';

export default function DashboardHeader() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm font-sans">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left side - Logo & Title (Click to Dashboard) */}
        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-xl">warehouse</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">
            WMS Portal
          </h1>
        </Link>

        {/* Right side - User Icon Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative" ref={userMenuRef}>
            <button
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="material-symbols-outlined text-gray-600 text-[20px]">person</span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                  <p className="text-sm font-semibold text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500 truncate">admin@wms-portal.com</p>
                </div>

                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/profile');
                  }}
                >
                  <span className="material-symbols-outlined text-[18px] text-gray-400">account_circle</span>
                  Profile
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined text-[18px] text-red-500">logout</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}