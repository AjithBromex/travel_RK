'use client';

import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, ArrowLeft, Lock, Mail, Loader2 } from 'lucide-react';

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
    lock.current = true;
    setBusy(true);
    setError('');

    const post = (body: object) =>
      fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

    try {
      let idToken: string;
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        idToken = await cred.user.getIdToken();
      } catch (authErr) {
        await post({ failedEmail: email.trim() }).catch(() => undefined);
        throw new Error(GENERIC);
      }

      const res = await post({ idToken });
      await signOut(auth); // the httpOnly cookie is the admin session; don't keep client auth
      if (!res.ok) throw new Error(GENERIC);

      router.replace('/admin');
    } catch (err) {
      await signOut(auth).catch(() => undefined);
      setError(GENERIC);
      setPassword('');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-7 shadow-2xl space-y-6 text-slate-100">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-1">
            <Shield className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">RK Travels • Admin Portal</h1>
          <p className="text-xs text-slate-400">
            Secure administrative control & record governance
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-semibold text-rose-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="email"
                autoComplete="username"
                required
                placeholder="admin@rktravels.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-slate-800 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:bg-slate-800 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <span>Sign in as Admin</span>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <Link
            href="/travel"
            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to User Portal</span>
          </Link>
          <span className="text-[11px] text-slate-500">v1.0 • Enterprise</span>
        </div>
      </div>
    </div>
  );
}
