import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export function Login({ onSwitch }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, role });
      }
      onSwitch?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#3b0d4d_0%,_#140018_60%)] px-4">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Ethara AI
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-white">Annotation Ops</h1>
          <p className="mt-2 text-sm text-ethara-muted">Team Task Manager</p>
        </div>

        <div className="mb-6 flex rounded-xl bg-ethara-bg p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-ethara-border text-white' : 'text-ethara-muted hover:text-white'
            }`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === 'register' ? 'bg-ethara-border text-white' : 'text-ethara-muted hover:text-white'
            }`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-ethara-muted">Full name</span>
                <input
                  className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ethara-muted">Role</span>
                <select
                  className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
            </>
          )}
          <label className="block">
            <span className="text-xs font-medium text-ethara-muted">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ethara-muted">Password</span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-ethara-border bg-ethara-bg px-4 py-3 text-sm text-white outline-none ring-white focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Enter workspace' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
