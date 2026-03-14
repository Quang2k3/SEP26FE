'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { ToastProvider } from './ToastProvider';
import { ModalProvider } from './ModalProvider';
import toast from 'react-hot-toast';

export function ClientProviders({ children }: { children: ReactNode }) {
  // Click vào bất kỳ toast nào để đóng
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-hot-toast]') || target.closest('[class*="go"]')) {
        // react-hot-toast dùng class "go..." — dismiss tất cả khi click
        toast.dismiss();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <>
      <ToastProvider />
      <ModalProvider>{children}</ModalProvider>
    </>
  );
}