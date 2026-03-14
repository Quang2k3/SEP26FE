import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from '@/components/ui/ClientProviders';
import AmbientCanvas from '@/components/ui/AmbientCanvas';

export const metadata: Metadata = {
  title: 'WMS - Warehouse Management System',
  description: 'Internal warehouse management application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AmbientCanvas />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}