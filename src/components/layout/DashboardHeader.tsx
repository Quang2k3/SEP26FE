'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardHeader() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    // Clear token
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0';
    
    // Redirect to login
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between border-b-[3px] border-solid border-[#333] bg-white px-10 py-4 sticky top-0 z-50">
      {/* Left side - Logo & Title */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="size-10 border-2 border-[#333] flex items-center justify-center font-bold text-xl">
            [L]
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">
            WMS DASHBOARD{' '}
            <span className="text-sm font-normal">(v.1.0_Draft)</span>
          </h1>
        </div>
      </div>

      {/* Right side - Nav & User */}
      <div className="flex flex-1 justify-end items-center gap-6">
        {/* Navigation Links */}
        <div className="flex gap-4">
          <span className="underline cursor-pointer hover:no-underline">
            Inventory
          </span>
          <span className="underline cursor-pointer hover:no-underline">
            Shipping
          </span>
          <span className="underline cursor-pointer hover:no-underline">
            Reports
          </span>
        </div>

        {/* User Icon with Dropdown */}
        <div className="relative">
          <button
            className="size-10 sketch-box flex items-center justify-center hover:bg-gray-50"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <span className="material-symbols-outlined">person</span>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 sketch-box bg-white">
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-[#333]"
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/profile');
                }}
              >
                👤 Profile
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-red-600 font-bold"
                onClick={handleLogout}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}