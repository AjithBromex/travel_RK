'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Ensure any cached session is cleared on the login screen
    if (typeof document !== 'undefined') {
      document.cookie = 'rk_admin=; path=/; max-age=0; SameSite=Lax';
    }
  }, []);

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
      if (res.ok) {
        // Authenticate client-side Firebase Auth if credentials match Firebase account
        try {
          const email = username.includes('@') ? username : `${username.toLowerCase()}@gmail.com`;
          await signInWithEmailAndPassword(auth, email, password);
        } catch (firebaseAuthErr) {
          console.warn('[AdminLogin] Firebase client auth notice:', firebaseAuthErr);
        }
        setBusy(false);
        router.push('/admin');
        router.refresh();
      } else {
        setBusy(false);
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'Invalid admin credentials');
      }
    } catch {
      setBusy(false);
      setErr('Connection error. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 antialiased text-slate-900">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden">
        {/* Brand Header - Pure SVG & Typography, No Images */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
          </div>

          <p className="text-xs font-black tracking-widest text-slate-900 uppercase">
            RK TRAVEL HUB
          </p>
          <p className="text-[10px] font-bold tracking-[0.2em] text-blue-600 uppercase mt-0.5">
            ADMIN GOVERNANCE PORTAL
          </p>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-2">
            Admin Sign In
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Sign in with administrative credentials to access controls &amp; records
          </p>
        </div>

        {/* Error Alert */}
        {err && (
          <div
            role="alert"
            className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="leading-tight">{err}</p>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Admin Email or Username
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@gmail.com"
                className="w-full h-11 pl-10 pr-3.5 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 pl-10 pr-10 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign in as Admin</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Footer Backlink */}
        <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to User Login</span>
          </Link>
          <span className="text-[11px] font-semibold text-slate-400">
            Enterprise v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
