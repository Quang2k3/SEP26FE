'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStoredSession, clearAuthToken } from '@/services/authService';

/**
 * BUFFER: Coi session hết hạn sớm hơn thực tế 60 giây
 * Tránh race condition: token còn hạn nhưng request gửi đi vừa expire
 */
const EXPIRY_BUFFER_MS = 60 * 1000;

/**
 * Kiểm tra session có còn hợp lệ không (có buffer)
 */
function checkSession(): boolean {
  if (typeof window === 'undefined') return false;
  const session = getStoredSession();
  if (!session) return false;
  // Coi như hết hạn trước 60 giây
  return session.expiresAt - EXPIRY_BUFFER_MS > Date.now();
}

export default function ProtectedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Dùng ref để track nếu đã redirect rồi thì không redirect lại
  const redirectedRef = useRef(false);

  // Chỉ chạy auth check 1 lần khi mount, KHÔNG chạy lại theo pathname
  // pathname thay đổi khi navigate nội bộ — token vẫn còn hạn, không cần recheck
  useEffect(() => {
    const valid = checkSession();
    if (!valid) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        clearAuthToken();
        router.replace('/login');
      }
    } else {
      setAuthed(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tự động check lại mỗi 5 phút trong khi user đang dùng
  // Nếu token hết hạn trong lúc dùng → logout gracefully
  useEffect(() => {
    if (!authed) return;

    const interval = setInterval(() => {
      const valid = checkSession();
      if (!valid && !redirectedRef.current) {
        redirectedRef.current = true;
        clearAuthToken();
        // Dùng window.location để hard reload — tránh stale state
        window.location.href = '/login';
      }
    }, 5 * 60 * 1000); // check mỗi 5 phút

    return () => clearInterval(interval);
  }, [authed]);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <div className="text-sm font-medium text-gray-500">Đang xác thực...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
