'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getValidSession, clearAuthToken } from '@/services/authService';
import type { ProtectedLayoutProps } from '@/interfaces/common';

export default function ProtectedDashboardLayout({
  children,
}: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const session = getValidSession();

    if (!session) {
      clearAuthToken();
      router.replace('/login');
    }
  }, [pathname, router]);

  return <>{children}</>;
}


