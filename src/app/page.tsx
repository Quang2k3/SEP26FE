import RequireAuth from '@/components/auth/RequireAuth';

export default function Home() {
  return (
    <RequireAuth>
      <div style={{ padding: 24 }}>
        <h1>Dashboard</h1>
        <p>Welcome to Warehouse Management System</p>
      </div>
    </RequireAuth>
  );
}
