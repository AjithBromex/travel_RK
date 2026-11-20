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
  Activity,
  Database,
  KeyRound,
  Server,
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

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (busy) return;
    if (!username.trim() || !password) {
      setErr('Please enter both username and password.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        // Authenticate client-side Firebase Auth so Firestore queries have full credentials
        const email = username.includes('@') ? username.trim() : `${username.trim().toLowerCase()}@gmail.com`;
        try {
          await Promise.race([
            signInWithEmailAndPassword(auth, email, password),
            new Promise((resolve) => setTimeout(resolve, 2500)),
          ]);
        } catch (firebaseAuthErr) {
          console.warn('[AdminLogin] Firebase client auth notice:', firebaseAuthErr);
        }

        // Redirect to admin console
        window.location.href = '/admin';
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative min-h-[100dvh] lg:h-screen lg:max-h-screen w-full flex items-center justify-center overflow-x-hidden lg:overflow-hidden font-sans bg-[#050B17] selection:bg-blue-600 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. CINEMATIC PURE CSS AMBIENT ATMOSPHERE (HARDWARE ACCELERATED)
          ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-60">
        <div
          className="absolute inset-0"
          style={{
            transform: 'translateZ(0)',
            background: `
              radial-gradient(circle 600px at 15% 20%, rgba(37, 99, 235, 0.25), transparent 70%),
              radial-gradient(circle 500px at 85% 80%, rgba(99, 102, 241, 0.2), transparent 70%)
            `,
          }}
        />
        {/* Subtle Grid Layer */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN RESPONSIVE CONTAINER (DESKTOP 2-COL / MOBILE STACK)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[1360px] min-h-[100dvh] lg:h-full lg:max-h-screen mx-auto p-3 sm:p-5 lg:px-8 lg:py-3 xl:px-12 xl:py-5 2xl:px-16 2xl:py-8 flex flex-col justify-between">
        {/* Top Floating Mini Header */}
        <div className="flex items-center justify-between py-1.5 sm:py-2.5 shrink-0">
          <Link
            href="/login?switch=true"
            onClick={() => {
              if (typeof document !== 'undefined') {
                document.cookie = 'firebase_auth=; path=/; max-age=0; SameSite=Lax';
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>User Portal</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Systems Online</span>
          </div>
        </div>

        {/* Central Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-14 items-center my-auto py-2 sm:py-4 lg:py-0">
          {/* ══════════════ LEFT COLUMN: GOVERNANCE SHOWCASE (DESKTOP) ══════════════ */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-4 lg:space-y-4 xl:space-y-6 2xl:space-y-8 pr-2 lg:pr-4">
            {/* Brand Monogram & Wordmark */}
            <div>
              <div className="flex items-center gap-3.5 xl:gap-4">
                <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 border border-white/20 p-2 shrink-0">
                  <ShieldCheck className="w-7 h-7 xl:w-8 xl:h-8 stroke-[2.2]" />
                </div>
                <div>
                  <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-black tracking-wider text-white uppercase drop-shadow-sm">
                    RK TRAVEL HUB
                  </h1>
                  <p className="text-[10px] xl:text-[11px] font-bold tracking-[0.25em] text-blue-400 uppercase mt-0.5">
                    ADMIN GOVERNANCE &amp; CONTROL
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Headline */}
            <div className="space-y-2 xl:space-y-3 pt-1">
              <div className="space-y-0.5 xl:space-y-1">
                <h2 className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[46px] 2xl:text-[54px] font-black tracking-tight text-white leading-[1.08]">
                  Centralized Fleet Control
                </h2>
                <h2 className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[46px] 2xl:text-[54px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 leading-[1.08]">
                  With Total Authority
                </h2>
              </div>

              {/* Tagline Divider */}
              <div className="flex items-center gap-3 pt-2 lg:pt-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA]" />
                  <div className="w-8 xl:w-10 h-0.5 bg-blue-400/80 rounded-full" />
                </div>
                <p className="text-[11px] xl:text-xs font-bold tracking-[0.22em] text-slate-300 uppercase">
                  ZERO-TRUST GOVERNANCE &nbsp;|&nbsp; REAL-TIME SYNC
                </p>
              </div>
            </div>

            {/* 4 Feature Value Pills */}
            <div className="grid grid-cols-2 gap-2.5 xl:gap-3.5 pt-2 xl:pt-4 max-w-xl">
              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl xl:rounded-2xl p-3 xl:p-4 flex items-center gap-3 shadow-lg hover:border-white/20 transition-all">
                <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg xl:rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-400/20">
                  <KeyRound className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] xl:text-xs font-bold text-white truncate">Super Admin Role</p>
                  <p className="text-[9px] xl:text-[10px] text-slate-400 truncate">Protected privileged claim</p>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl xl:rounded-2xl p-3 xl:p-4 flex items-center gap-3 shadow-lg hover:border-white/20 transition-all">
                <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg xl:rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/20">
                  <Activity className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] xl:text-xs font-bold text-white truncate">Live Dispatch Sync</p>
                  <p className="text-[9px] xl:text-[10px] text-slate-400 truncate">Automatic two-way events</p>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl xl:rounded-2xl p-3 xl:p-4 flex items-center gap-3 shadow-lg hover:border-white/20 transition-all">
                <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg xl:rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-400/20">
                  <Database className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] xl:text-xs font-bold text-white truncate">Unified Data Ledger</p>
                  <p className="text-[9px] xl:text-[10px] text-slate-400 truncate">Trips, fleet &amp; cash audit</p>
                </div>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl xl:rounded-2xl p-3 xl:p-4 flex items-center gap-3 shadow-lg hover:border-white/20 transition-all">
                <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg xl:rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/20">
                  <Server className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] xl:text-xs font-bold text-white truncate">Cloud Backed</p>
                  <p className="text-[9px] xl:text-[10px] text-slate-400 truncate">Cloud Firestore &amp; Auth</p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════ RIGHT COLUMN: TRANSLUCENT FROSTED GLASS LOGIN CARD ══════════════ */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[390px] lg:max-w-[400px] xl:max-w-[430px] bg-white/95 backdrop-blur-2xl p-4 sm:p-6 lg:p-5 xl:p-7 2xl:p-8 rounded-[24px] sm:rounded-[30px] xl:rounded-[36px] border border-white/90 shadow-[0_25px_65px_-12px_rgba(0,0,0,0.65)] relative overflow-hidden transition-all text-slate-900">
              {/* Card Header */}
              <div className="mb-3 lg:mb-3.5 xl:mb-4 text-center">
                <div className="w-11 h-11 lg:w-11 lg:h-11 xl:w-13 xl:h-13 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                  <ShieldCheck className="w-6 h-6 xl:w-7 xl:h-7 stroke-[2.2]" />
                </div>

                <p className="text-[11px] font-black tracking-widest text-slate-900 uppercase">
                  RK TRAVEL HUB
                </p>
                <p className="text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase mt-0.5">
                  ADMIN GOVERNANCE PORTAL
                </p>

                <h2 className="text-xl sm:text-[22px] xl:text-[24px] font-black tracking-tight text-slate-900 mt-1.5">
                  Admin Sign In
                </h2>
                <p className="text-[11px] xl:text-xs text-slate-500 mt-0.5 max-w-xs mx-auto leading-snug">
                  Enter administrative credentials to access controls, modules &amp; records
                </p>
              </div>

              {/* Error Alert */}
              {err && (
                <div
                  role="alert"
                  className="p-2.5 mb-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="leading-tight">{err}</p>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={submit} className="space-y-2.5 lg:space-y-2.5 xl:space-y-3">
                <div>
                  <label className="block text-[11px] xl:text-xs font-bold text-slate-700 mb-1">
                    Admin Email or Username
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      name="username"
                      id="admin_login_id"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter admin email or username"
                      className="w-full h-9.5 lg:h-9.5 xl:h-10 pl-10 pr-3.5 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] xl:text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      id="admin_secret_key"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter password"
                      className="w-full h-9.5 lg:h-9.5 xl:h-10 pl-10 pr-10 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 lg:h-10 xl:h-11 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to Admin Console</span>
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-end text-xs text-slate-500">
                <span className="text-[10px] xl:text-[11px] font-semibold text-slate-400">
                  Enterprise v2.4
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Footer */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 py-1.5 sm:py-2.5 border-t border-white/5 shrink-0">
          <p>&copy; {new Date().getFullYear()} RK Travel Hub. Administrative Governance System.</p>
          <p className="hidden sm:block">Encrypted TLS &bull; Zero-Trust Access</p>
        </div>
      </div>
    </div>
  );
}
