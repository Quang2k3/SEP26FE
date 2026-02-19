'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from './DashboardHeader';
import SecondaryNav from './SecondaryNav';

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
      <SecondaryNav />
      <main className="px-10 py-8 max-w-[1280px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}