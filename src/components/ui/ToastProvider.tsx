'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 16, right: 16 }}
      toastOptions={{
        duration: 4000,
        style: {
          maxWidth: '380px',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: '500',
          lineHeight: '1.4',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          cursor: 'pointer',
        },
        success: {
          style: {
            background: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
          },
          iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
        },
        error: {
          duration: 5000,
          style: {
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
          },
          iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
        },
      }}
    />
  );
}