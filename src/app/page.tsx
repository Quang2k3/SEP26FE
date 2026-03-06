'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getValidSession } from '@/services/authService';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getValidSession();
    if (session) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-sm font-medium text-gray-500">Loading...</div>
      </div>
    </div>
  );
}
