"use client"

import { useState } from "react"
import Image from "next/image"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Bus,
} from "lucide-react"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.")
      return
    }

    setLoading(true)

    try {
      // 1. Authenticate with Firebase Auth client
      let userCredential
      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        )
      } catch (authErr: any) {
        // Sign out in case of any partial state
        await signOut(auth).catch(() => {})

        if (authErr?.code === "auth/too-many-requests") {
          setErrorMessage(
            "Access has been temporarily locked due to too many failed attempts. Please try again later."
          )
        } else {
          // Requirement c: Generic message, never reveal whether the email exists
          setErrorMessage("Invalid admin credentials.")
        }
        setLoading(false)
        return
      }

      // 2. Retrieve force-refreshed ID token with latest custom claims
      const idToken = await userCredential.user.getIdToken(true)

      // 3. Server-side verification & session cookie exchange
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, email: email.trim() }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Requirement c: Claim is missing or invalid -> sign out immediately
        await signOut(auth).catch(() => {})
        setErrorMessage(data?.error || "Invalid admin credentials.")
        setLoading(false)
        return
      }

      // 4. Success: Redirect into /admin dashboard
      window.location.replace("/admin")
    } catch (err: unknown) {
      await signOut(auth).catch(() => {})
      setErrorMessage("Invalid admin credentials.")
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden selection:bg-rose-600/30 selection:text-white font-sans bg-slate-950">
      {/* ─── 1. Cinematic Background with Force Traveller ─── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/login-scenic-bg.jpg')" }}
      >
        <Image
          src="/images/login-scenic-bg.jpg"
          alt="RK Travel Alpine Highway with Force Traveller"
          fill
          priority
          unoptimized
          className="object-cover object-center scale-[1.01]"
        />
        {/* Dark overlay for administrative security mood */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/80 lg:from-slate-950/85 lg:via-slate-950/50 lg:to-slate-950/40" />
      </div>

      {/* ─── 2. Responsive Canvas ─── */}
      <div className="relative z-10 w-full max-w-[1440px] min-h-screen mx-auto p-4 sm:p-6 lg:p-12 flex flex-col justify-between">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between pb-4">
          <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl shadow-xl">
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/images/rk-logo.png"
                alt="RK Logo"
                fill
                className="object-contain drop-shadow"
              />
            </div>
            <div>
              <p className="text-xs font-black text-white tracking-wider uppercase">
                RK TRAVEL HUB
              </p>
              <p className="text-[8px] font-bold text-rose-300 tracking-[0.2em] uppercase">
                ADMIN CONSOLE
              </p>
            </div>
          </div>
        </div>

        {/* Center Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-4 sm:py-8">
          {/* ══════════════ LEFT COLUMN: ADMIN SECURITY OVERVIEW (DESKTOP) ══════════════ */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8 pr-6">
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-950/70 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-2xl p-2 relative group hover:border-rose-400/50 transition-colors">
                  <div className="relative w-full h-full">
                    <Image
                      src="/images/rk-logo.png"
                      alt="RK Monogram"
                      fill
                      priority
                      className="object-contain drop-shadow-[0_4px_12px_rgba(244,63,94,0.35)]"
                    />
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase drop-shadow-md">
                    RK TRAVEL HUB
                  </h1>
                  <p className="text-[11px] font-bold tracking-[0.28em] text-rose-300 uppercase drop-shadow mt-0.5">
                    SECURE ADMIN CONSOLE
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <h2 className="text-5xl lg:text-[64px] font-black italic text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] leading-[1.04]">
                  Administrative
                </h2>
                <h2 className="text-5xl lg:text-[64px] font-black italic text-rose-400 tracking-tight drop-shadow-[0_4px_20px_rgba(244,63,94,0.45)] leading-[1.04]">
                  Access Control
                </h2>
              </div>

              <div className="flex items-center gap-3.5 pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#F43F5E]" />
                  <div className="w-10 h-0.5 bg-rose-400/80 rounded-full" />
                </div>
                <p className="text-xs font-bold tracking-[0.25em] text-slate-100 uppercase drop-shadow">
                  RESTRICTED ACCESS &nbsp;|&nbsp; AUDITED SESSIONS
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 max-w-lg">
              <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 border border-rose-400/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Custom Claim Guard</p>
                  <p className="text-[10px] text-slate-300">Server verified admin credentials</p>
                </div>
              </div>

              <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Brute-Force Shield</p>
                  <p className="text-[10px] text-slate-300">Rate-limited & audit-logged</p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════ RIGHT COLUMN: ADMIN LOGIN CARD ══════════════ */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[440px] bg-white/90 sm:bg-white/95 backdrop-blur-2xl p-7 sm:p-9 rounded-[36px] border border-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.5)] relative overflow-hidden transition-all">
              {/* Card Header */}
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

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  Restricted Gateway
                </div>

                {/* Requirement a: Heading "Admin Login" */}
                <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900">
                  Admin Login
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Enter your administrative credentials to manage fleet operations, financial ledgers, and system security.
                </p>
              </div>

              {/* Feedback Error Alert */}
              {errorMessage && (
                <div
                  id="admin-login-error"
                  role="alert"
                  className="p-3.5 mb-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-rose-800 animate-in fade-in duration-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="leading-tight">{errorMessage}</p>
                </div>
              )}

              {/* Requirement a: Email and Password only. No signup, no forgot password, no social login */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
                    <input
                      id="admin-email-input"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="admin@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
                    <input
                      id="admin-password-input"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-11 pr-11 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 transition-all"
                    />
                    <button
                      type="button"
                      id="admin-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                  id="admin-login-submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-[0.99] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Admin Credentials...</span>
                    </>
                  ) : (
                    <span>Sign In to Admin Portal</span>
                  )}
                </button>
              </form>

              {/* Bottom security notice */}
              <div className="mt-6 pt-5 border-t border-slate-200/70 text-center">
                <p className="text-[11px] text-slate-400 font-medium">
                  Authorised personnel only. All access attempts are audited and logged with IP timestamping.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 pb-2 text-center">
          <p className="text-xs font-semibold text-slate-400 drop-shadow">
            &copy; {new Date().getFullYear()} RK Travel Hub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
