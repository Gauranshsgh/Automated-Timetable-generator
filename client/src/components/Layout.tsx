import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface)' }}>
      {/* ─── Navigation Bar ─────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'var(--color-surface-container)',
          borderBottom: '2px solid var(--color-outline-variant)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{
                border: '2px solid var(--color-primary)',
                background: 'rgba(0, 229, 255, 0.1)',
              }}
            >
              <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>TG</span>
            </div>
            <div>
              <h1
                className="font-headline text-base leading-none"
                style={{ color: 'var(--color-on-surface)' }}
              >
                TIMETABLE GENERATOR
              </h1>
              <span
                className="font-label"
                style={{ color: 'var(--color-outline)', fontSize: '9px' }}
              >
                MATRIX CONSTRAINT ENGINE v1.0
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="font-label no-underline transition-colors"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              Dashboard
            </Link>
            <Link
              to="/wizard"
              className="font-label no-underline transition-colors"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              New Timetable
            </Link>
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono text-xs" style={{ color: 'var(--color-on-surface)' }}>
                {user?.name}
              </div>
              <div
                className="font-label"
                style={{
                  color: 'var(--color-primary)',
                  fontSize: '9px',
                }}
              >
                {user?.role?.toUpperCase()}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────── */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
