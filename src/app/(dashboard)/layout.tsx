import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  // Bọc Component DashboardLayout (có chứa Header và SecondaryNav) ra ngoài children
  return <DashboardLayout>{children}</DashboardLayout>;
}