'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '../admin.css';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      setBusy(false);
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Invalid admin credentials');
      }
    } catch {
      setBusy(false);
      setErr('Connection error. Please try again.');
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit} className="login-card">
        <div>
          <h1>RK Travel Hub</h1>
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: '4px' }}>
            Admin Governance Sign In
          </p>
        </div>

        <label>
          Admin Email or Username
          <input
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin@gmail.com"
            required
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}

        <button className="btn primary" disabled={busy} style={{ marginTop: '0.5rem' }}>
          {busy ? 'Signing in…' : 'Sign in as Admin'}
        </button>

        <div style={{ borderTop: '1px solid var(--admin-line)', paddingTop: '1rem', marginTop: '0.5rem', textAlign: 'center' }}>
          <Link href="/login" className="link" style={{ fontSize: '0.85rem' }}>
            ← Back to User Login
          </Link>
        </div>
      </form>
    </main>
  );
}
