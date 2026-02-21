'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Thêm usePathname
import Link from 'next/link';

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname(); // Lấy đường dẫn URL hiện tại
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; max-age=0';
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

  // Danh sách các menu chính
  const navLinks = [
    { name: 'Category', path: '/category' },
    { name: 'Zone', path: '/zone' },
    { name: 'Bin', path: '/bin' },
  ];

  return (
    <header className="flex items-center justify-between border-b-[3px] border-solid border-[#333] bg-white px-10 py-4 sticky top-0 z-50">
      {/* Left side - Logo & Title (Click to Dashboard) */}
      <Link href="/dashboard" className="flex items-center gap-4 cursor-pointer hover:opacity-80">
        <div className="size-10 border-2 border-[#333] flex items-center justify-center font-bold text-xl">
          [L]
        </div>
        <h1 className="text-2xl font-bold tracking-tight uppercase">
          WMS DASHBOARD
        </h1>
      </Link>

      {/* Right side - Nav Links & User */}
      <div className="flex flex-1 justify-end items-center gap-6">
                {/* Navigation Links - Đã xóa gạch chân */}
        <nav className="flex items-center gap-2 md:gap-4">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                href={link.path}
                className={`text-lg px-4 py-1.5 transition-all ${
                  isActive 
                    ? 'font-bold border-2 border-black bg-black text-white shadow-[2px_2px_0px_#000]' // Highlight hộp đen
                    : 'font-bold text-gray-600 hover:text-black hover:bg-gray-100 border-2 border-transparent' // Bình thường (không gạch chân)
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User Icon Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="size-10 sketch-box flex items-center justify-center hover:bg-gray-50"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <span className="material-symbols-outlined">person</span>
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 sketch-box bg-white overflow-hidden">
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-[#333] font-bold"
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/profile');
                }}
              >
                Profile
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 font-bold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}