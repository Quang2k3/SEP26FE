'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from './DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <DashboardHeader />
      <main className="px-10 py-8 max-w-[1280px] mx-auto w-full">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="mt-auto px-10 py-8 border-t-[3px] border-[#333] text-center bg-white">
        <div className="flex justify-center gap-12 text-sm font-bold uppercase mb-4">
          <span className="underline cursor-pointer">Support</span>
          <span className="underline cursor-pointer">Documentation</span>
          <span className="underline cursor-pointer">Settings</span>
        </div>
        <p className="text-xs text-gray-500">
          WMS Wireframe Concept | Non-Interactive Mockup v4.2 | 2024
        </p>
      </footer>
    </div>
  );
}