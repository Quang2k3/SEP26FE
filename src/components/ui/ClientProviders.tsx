'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from './ToastProvider';
import { ModalProvider } from './ModalProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ToastProvider />
      <ModalProvider>{children}</ModalProvider>
    </>
  );
}


