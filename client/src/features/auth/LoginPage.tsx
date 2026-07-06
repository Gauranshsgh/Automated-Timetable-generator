import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        const res: any = await api.register({ email, password, name });
        login(res.data.token, res.data.refreshToken, res.data.user);
        toast.success('Account created successfully');
      } else {
        const res = await api.login(email, password);
        login(res.data.token, res.data.refreshToken, res.data.user);
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="w-full max-w-md animate-fade-in">
        {/* ─── Header ───────────────────────────────────── */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto mb-4 flex items-center justify-center animate-pulse-glow"
            style={{
              border: '2px solid var(--color-primary)',
              background: 'rgba(0, 229, 255, 0.05)',
            }}
          >
            <span className="font-mono text-xl" style={{ color: 'var(--color-primary)' }}>TG</span>
          </div>
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-on-surface)' }}>
            TIMETABLE GENERATOR
          </h1>
          <p className="font-label mt-2" style={{ color: 'var(--color-outline)' }}>
            AUTOMATED ACADEMIC SCHEDULING SYSTEM
          </p>
        </div>

        {/* ─── Form Card ────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span>{isRegister ? 'CREATE ACCOUNT' : 'AUTHENTICATION'}</span>
            <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
              {isRegister ? 'REG-01' : 'AUTH-01'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            {isRegister && (
              <div>
                <label className="input-label">Operator Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="input-label">Access ID (Email)</label>
              <input
                type="email"
                className="input-field"
                placeholder="operator@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">Security Key</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : isRegister ? 'INITIALIZE ACCOUNT' : 'AUTHORIZE ACCESS'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-label transition-colors cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--color-primary)', fontSize: '10px' }}
              >
                {isRegister
                  ? '← RETURN TO LOGIN TERMINAL'
                  : 'REQUEST NEW ACCESS →'}
              </button>
            </div>

            {!isRegister && (
              <div
                className="mt-2 p-3 text-center"
                style={{
                  background: 'var(--color-surface-lowest)',
                  border: '1px dashed var(--color-outline-variant)',
                }}
              >
                <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
                  DEMO CREDENTIALS
                </span>
                <div className="font-mono text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>
                  admin@timetable.edu / admin123
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
