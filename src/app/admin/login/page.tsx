'use client';

import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, ArrowLeft, Lock, Mail, Loader2, ChevronRight, AlertCircle } from 'lucide-react';

const GENERIC = 'Invalid admin credentials.';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@gmail.com');
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
      const resolvedEmail = email.trim().includes('@')
        ? email.trim().toLowerCase()
        : `${email.trim().toLowerCase()}@gmail.com`;

      let idToken: string;
      try {
        const cred = await signInWithEmailAndPassword(auth, resolvedEmail, password);
        idToken = await cred.user.getIdToken();
      } catch (authErr: unknown) {
        await post({ failedEmail: resolvedEmail }).catch(() => undefined);
        const code = (authErr as { code?: string })?.code;
        if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
          throw new Error('Invalid email/username or password.');
        }
        if (code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Access temporarily restricted for security.');
        }
        throw new Error(GENERIC);
      }

      const res = await post({ idToken });
      await signOut(auth); // the httpOnly cookie is the admin session; don't keep client auth
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'This account does not have admin privileges.');
      }

      window.location.href = '/admin';
    } catch (err: unknown) {
      await signOut(auth).catch(() => undefined);
      setError((err as Error)?.message || GENERIC);
      setPassword('');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] bg-white/85 sm:bg-white/90 backdrop-blur-2xl p-6 sm:p-9 rounded-[28px] sm:rounded-[36px] border border-white/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.4)] relative overflow-hidden transition-all text-slate-900">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <Image
            src="/images/rk-logo.png"
            alt="RK Travel Hub Logo"
            fill
            priority
            className="object-contain drop-shadow-md"
          />
        </div>

        <p className="text-xs font-bold tracking-widest text-slate-900 uppercase">
          RK TRAVEL HUB
        </p>
        <p className="text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase mt-0.5">
          ADMIN GOVERNANCE PORTAL
        </p>

        <h2 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 mt-2.5">
          Admin Sign In
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Enter administrative credentials to access system controls &amp; fleet records
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="leading-tight">{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Admin Email or Username
          </label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              autoComplete="username"
              required
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 bg-[#1565D8] hover:bg-[#0D57C5] active:scale-[0.99] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 mt-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <span>Sign in as Admin</span>
              <ChevronRight className="w-4 h-4 stroke-[2.75]" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Login</span>
        </Link>
        <span className="text-[11px] font-semibold text-slate-400">Enterprise v1.0</span>
      </div>
    </div>
  );
}

