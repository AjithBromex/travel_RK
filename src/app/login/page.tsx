"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  User,
  AlertCircle,
  Bus,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { getFriendlyAuthErrorMessage } from "@/lib/firebase/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, resetPassword, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const urlError = searchParams.get("error");
  const initialError =
    urlError === "Unauthorized"
      ? "You are not authorized to view that page. Please log in with an authorized account."
      : urlError
      ? "Authentication failed. Please log in."
      : "";

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(initialError);
  const [successMessage, setSuccessMessage] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/travel";

  useEffect(() => {
    // If user is already authenticated in Firebase, redirect immediately
    if (user) {
      const destination = callbackUrl.startsWith("/travel")
        ? callbackUrl
        : "/travel";
      router.replace(destination);
    }
  }, [user, callbackUrl, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await signIn(userId, password);
      const destination = callbackUrl.startsWith("/travel")
        ? callbackUrl
        : "/travel";
      window.location.replace(destination);
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(getFriendlyAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const email = userId.includes("@")
        ? userId
        : `${userId.toLowerCase()}@rktravelhub.com`;
      const name = displayName || userId.toUpperCase();
      await signUp(email, password, name, "admin");
      const destination = callbackUrl.startsWith("/travel")
        ? callbackUrl
        : "/travel";
      window.location.replace(destination);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setError(getFriendlyAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your User ID or Email to reset your password.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await resetPassword(resetEmail);
      setSuccessMessage(
        "Password reset email sent! Check your inbox for instructions."
      );
      setIsResetMode(false);
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden selection:bg-blue-600/10 selection:text-blue-600">
      {/* High-Performance Hardware-Accelerated Ambient Light Background (Matches AppLayout) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Soft radial glow orbs */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `
              radial-gradient(circle 800px at 75% 10%, rgba(219, 234, 254, 0.7), transparent 70%),
              radial-gradient(circle 700px at 15% 30%, rgba(243, 232, 255, 0.45), transparent 70%),
              radial-gradient(circle 900px at 80% 85%, rgba(220, 252, 231, 0.4), transparent 70%),
              radial-gradient(circle 600px at 25% 90%, rgba(238, 242, 255, 0.5), transparent 70%)
            `,
          }}
        />

        {/* Subtle geometric dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#1E293B 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-2xl p-7 sm:p-9 rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.06)] relative">
          {/* Header */}
          <div className="mb-6 text-center">
            {/* Bus Brand Emblem with subtle blue glow */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 mb-3 mx-auto flex items-center justify-center text-white">
              <Bus className="w-6 h-6" />
            </div>

            {/* Small uppercase tag matching Operations Hub */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-600 text-[10px] font-bold tracking-wider uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>RK TRAVEL HUB</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-display">
              {isResetMode
                ? "Reset Password"
                : isRegisterMode
                ? "Create Account"
                : "Travel Portal"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {isResetMode
                ? "Enter your User ID or email to receive reset instructions"
                : isRegisterMode
                ? "Create an administrator account for RK Travel Hub"
                : "Enter your credentials to access the management portal"}
            </p>
          </div>

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3.5 mb-5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="leading-tight">{successMessage}</p>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="leading-tight">{error}</p>
            </div>
          )}

          {/* Reset Password Form */}
          {isResetMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  User ID / Email
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your user ID or email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <KeyRound className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setError("");
                }}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 pt-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          ) : isRegisterMode ? (
            /* Register Mode */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full h-11 pl-10 pr-10 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <UserPlus className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Already have an account?{" "}
                  <span className="font-semibold text-blue-600 hover:underline">
                    Sign In
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* Main Sign In Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                    className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all uppercase"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError("");
                      setSuccessMessage("");
                      setResetEmail(userId);
                    }}
                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
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
                    className="w-full h-11 pl-10 pr-10 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Need to set up access?{" "}
                  <span className="font-semibold text-blue-600 hover:underline">
                    Create Account
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security / System Footer Pill */}
        <div className="mt-5 text-center flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-600">
              Enterprise Fleet &amp; Operations Access Only
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
