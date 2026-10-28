"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ShieldCheck, Lock, Eye, EyeOff,
  ChevronRight, Loader2, User, AlertCircle,
  Bus, CheckCircle2, ArrowLeft, KeyRound, UserPlus
} from "lucide-react"
import { useAuth } from "@/lib/firebase/AuthContext"
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/auth"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signUp, resetPassword, user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const urlError = searchParams.get("error")
  const initialError = urlError === "Unauthorized"
    ? "You are not authorized to view that page. Please log in with an authorized account."
    : urlError ? "Authentication failed. Please log in." : ""

  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState(initialError)
  const [successMessage, setSuccessMessage] = useState("")
  const [isResetMode, setIsResetMode] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [resetEmail, setResetEmail] = useState("")

  const callbackUrl = searchParams.get("callbackUrl") || "/travel"

  useEffect(() => {
    // If user is already authenticated in Firebase, redirect immediately
    if (user) {
      const destination = callbackUrl.startsWith("/travel") ? callbackUrl : "/travel"
      router.replace(destination)
    }
  }, [user, callbackUrl, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      await signIn(userId, password)
      const destination = callbackUrl.startsWith("/travel") ? callbackUrl : "/travel"
      window.location.replace(destination)
    } catch (err: unknown) {
      console.error("Login error:", err)
      setError(getFriendlyAuthErrorMessage(err))
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const email = userId.includes("@") ? userId : `${userId.toLowerCase()}@rktravelhub.com`
      const name = displayName || userId.toUpperCase()
      await signUp(email, password, name, "admin")
      const destination = callbackUrl.startsWith("/travel") ? callbackUrl : "/travel"
      window.location.replace(destination)
    } catch (err: unknown) {
      console.error("Registration error:", err)
      setError(getFriendlyAuthErrorMessage(err))
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail) {
      setError("Please enter your User ID or Email to reset your password.")
      return
    }

    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      await resetPassword(resetEmail)
      setSuccessMessage("Password reset email sent! Check your inbox for instructions.")
      setIsResetMode(false)
    } catch (err: unknown) {
      console.error("Password reset error:", err)
      setError(getFriendlyAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Subtle ambient light glow for glassmorphism */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl p-7 sm:p-9 rounded-2xl border border-slate-200/80 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.08)] relative">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 shadow-lg shadow-slate-900/20 mb-3 mx-auto flex items-center justify-center text-white">
              <Bus className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">RK Travel Hub</p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {isResetMode ? "Reset Password" : isRegisterMode ? "Register Account" : "Travel Portal"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isResetMode
                ? "Enter your User ID or email to receive reset instructions"
                : isRegisterMode
                ? "Create an administrator account for RK Travel Hub"
                : "Enter your credentials to access the management portal"}
            </p>
          </div>

          {/* Success */}
          {successMessage && (
            <div className="p-3.5 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-800 leading-tight">{successMessage}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="text-xs font-semibold text-rose-800 leading-tight">{error}</p>
            </div>
          )}

          {/* Reset Password Form */}
          {isResetMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  User ID or Email
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your user ID or email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Reset Link <KeyRound className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false)
                  setError("")
                }}
                className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          ) : isRegisterMode ? (
            /* Register Mode */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Full Name / Display Name
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  User ID / Email
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your user ID or email"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-10 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-md shadow-blue-500/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <UserPlus className="w-4 h-4" /></>}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false)
                    setError("")
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Already have an account? <span className="underline font-semibold text-blue-600">Sign In</span>
                </button>
              </div>
            </form>
          ) : (
            /* Main Sign In Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  User ID / Email
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your user ID or email"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 transition-all uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true)
                      setError("")
                      setSuccessMessage("")
                      setResetEmail(userId)
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-10 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-md shadow-blue-500/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ChevronRight className="w-4 h-4" /></>}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true)
                    setError("")
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Need to set up access? <span className="underline font-semibold text-blue-600">Create Account</span>
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-600">Enterprise Fleet Access Only</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
