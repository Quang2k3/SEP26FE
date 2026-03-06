import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedDashboardLayout from '@/components/auth/ProtectedDashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedDashboardLayout>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedDashboardLayout>
  );
}