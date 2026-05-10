import { useAuth } from './context/AuthContext.jsx';
import { Login } from './pages/Login.jsx';
import { MemberDashboard } from './pages/MemberDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ethara-bg">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ethara-border border-t-ethara-accent" />
          <p className="mt-4 text-sm text-ethara-muted">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user?.role?.toLowerCase?.() === 'admin') {
    return <AdminDashboard />;
  }

  return <MemberDashboard />;
}
