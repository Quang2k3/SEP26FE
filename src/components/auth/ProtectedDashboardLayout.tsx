'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getValidSession, clearAuthToken } from '@/services/authService';
import type { ProtectedLayoutProps } from '@/interfaces/common';

export default function ProtectedDashboardLayout({
  children,
}: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = getValidSession();

    if (!session) {
      clearAuthToken();
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [pathname, router]);

  // Hiển thị loading khi đang check token
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-sm font-medium text-gray-500">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


