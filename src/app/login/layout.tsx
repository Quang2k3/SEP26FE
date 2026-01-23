import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* AuthProvider bọc toàn bộ app */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
