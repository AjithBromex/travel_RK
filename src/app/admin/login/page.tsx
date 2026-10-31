"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (r.ok) {
        window.location.replace("/admin");
        return;
      }

      const data = await r.json().catch(() => ({}));
      setError(data.error ?? "Invalid admin credentials.");
    } catch {
      setError("Invalid admin credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#0f2f78] via-[#103a94] to-[#1558f0] p-4 font-sans selection:bg-blue-300 selection:text-slate-900">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl border border-white/40"
      >
        {/* Emblem */}
        <div className="mx-auto mb-4 relative w-14 h-14 flex items-center justify-center rounded-2xl bg-blue-50 text-[#1558f0] p-2 border border-blue-100">
          <Image
            src="/images/rk-logo.png"
            alt="RK Travel Hub"
            fill
            className="object-contain p-1"
          />
        </div>

        {/* Heading */}
        <h1 className="text-center text-2xl font-black text-slate-900 tracking-tight">
          Admin Login
        </h1>
        <p className="mb-6 mt-1 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
          RK Travel Hub &bull; Restricted Access
        </p>

        {/* Feedback Alert */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-700 animate-in fade-in duration-150">
            {error}
          </div>
        )}

        {/* Email Field */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-bold text-slate-700">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="admin@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-[#1558f0] focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>

        {/* Password Field */}
        <div className="mb-6">
          <label className="mb-1 block text-xs font-bold text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-3 text-sm font-medium outline-none focus:border-[#1558f0] focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1558f0] hover:bg-[#0f4bd8] active:scale-[0.99] py-3.5 font-bold text-sm text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span>Sign in</span>
            </>
          )}
        </button>

        <p className="mt-6 text-center text-[11px] text-slate-400 font-medium">
          Authorized personnel only &bull; Audited session
        </p>
      </form>
    </div>
  );
}
