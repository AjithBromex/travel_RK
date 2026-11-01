'use client';
// ASSUMPTION: adjust to what src/lib/firebase/config.ts actually exports.
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const GENERIC = 'Invalid admin credentials.';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const post = (body: object) => fetch('/api/admin/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try {
      let idToken: string;
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        idToken = await cred.user.getIdToken();
      } catch {
        await post({ failedEmail: email.trim() }).catch(() => undefined); // feeds the rate limiter
        throw new Error(GENERIC);
      }
      const res = await post({ idToken });
      await signOut(auth); // the httpOnly cookie is the admin session; don't keep a client login
      if (!res.ok) throw new Error(GENERIC);
      router.replace('/admin');
    } catch {
      await signOut(auth).catch(() => undefined);
      setError(GENERIC); setPassword('');
    } finally { lock.current = false; setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
      <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <label className="block text-sm font-medium">Email
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label className="block text-sm font-medium">Password
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60">
        {busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
