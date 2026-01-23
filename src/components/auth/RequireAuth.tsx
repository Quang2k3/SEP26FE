'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * RequireAuth
 * - Chặn route nếu chưa login
 * - Redirect về /login
 */
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Nếu chưa login → về trang login
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Chưa có user thì không render gì
  if (!user) return null;

  return <>{children}</>;
}
