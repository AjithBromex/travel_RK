"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
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
  Shield,
  Users,
  MapPin,
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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden selection:bg-blue-600/20 selection:text-blue-600">
      {/* ─── 1. Cinematic Background with Force Traveller on Mountain Highway ─── */}
      <div className="fixed inset-0 -z-20">
        <Image
          src="/images/login-scenic-bg.jpg"
          alt="RK Travel Scenic Highway"
          fill
          priority
          className="object-cover object-center scale-[1.01]"
        />
        {/* Soft directional gradient to guarantee high text readability on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/30 to-slate-950/20 lg:from-slate-950/70 lg:via-slate-950/25 lg:to-transparent" />
      </div>

      {/* ─── 2. Main Responsive Canvas (Split Layout on Desktop) ─── */}
      <div className="relative z-10 w-full max-w-[1440px] min-h-screen mx-auto p-4 sm:p-6 lg:p-12 flex flex-col justify-between">
        {/* Top Bar on Mobile or Space */}
        <div className="w-full flex items-center justify-between">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-md">
              <Bus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                RK Travel Hub
              </p>
              <p className="text-[9px] text-slate-300 tracking-widest uppercase">
                Travel Beyond Borders
              </p>
            </div>
          </div>
        </div>

        {/* Center Grid: Left Showcase & Right Login Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-8">
          {/* ════ LEFT COLUMN: BRAND SLOGAN & SHOWCASE ════ */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8 pr-4">
            {/* Top-left: Metallic RK Logo */}
            <div>
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-2xl p-2.5">
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Interconnected geometric RK emblem */}
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <defs>
                        <linearGradient id="rkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#93C5FD" />
                          <stop offset="50%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1D4ED8" />
                        </linearGradient>
                        <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="60%" stopColor="#CBD5E1" />
                          <stop offset="100%" stopColor="#94A3B8" />
                        </linearGradient>
                      </defs>
                      <path d="M22 15 L45 15 C60 15, 68 25, 68 38 C68 48, 60 56, 48 58 L72 85 L54 85 L35 60 L35 85 L22 85 Z" fill="url(#rkGrad)" />
                      <path d="M35 28 L45 28 C52 28, 55 32, 55 38 C55 44, 52 48, 45 48 L35 48 Z" fill="url(#silverGrad)" />
                      <path d="M56 42 L80 15 L92 27 L68 54 Z" fill="url(#silverGrad)" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase font-display drop-shadow-md">
                    RK TRAVEL HUB
                  </h1>
                  <p className="text-[10px] font-bold tracking-[0.25em] text-blue-200/90 uppercase drop-shadow">
                    TRAVEL BEYOND BORDERS
                  </p>
                </div>
              </div>
            </div>

            {/* Middle: Signature Headline & Values */}
            <div className="space-y-4 pt-2">
              <div className="space-y-0.5">
                <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black italic text-white tracking-tight drop-shadow-lg leading-[1.04]">
                  Safe Journeys
                </h2>
                <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black italic text-white tracking-tight drop-shadow-lg leading-[1.04]">
                  Stronger
                </h2>
                <h2 className="text-4xl sm:text-5xl lg:text-[64px] font-black italic text-[#60A5FA] tracking-tight drop-shadow-lg leading-[1.04]">
                  Connections
                </h2>
              </div>

              {/* Tagline divider with blue line */}
              <div className="flex items-center gap-3 pt-2">
                <div className="w-10 h-0.5 bg-blue-400 rounded-full shadow-sm" />
                <p className="text-xs font-bold tracking-[0.25em] text-slate-100 uppercase drop-shadow">
                  COMFORT &nbsp;|&nbsp; SAFETY &nbsp;|&nbsp; RELIABILITY
                </p>
              </div>
            </div>

            {/* Bottom: 4 Key Value Badges */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 pt-4">
              <div className="bg-slate-950/45 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/25">
                  <Bus className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Modern Fleet</p>
                  <p className="text-[10px] text-slate-300 truncate">Well maintained vehicles</p>
                </div>
              </div>

              <div className="bg-slate-950/45 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/25">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Safe Travel</p>
                  <p className="text-[10px] text-slate-300 truncate">Your safety, our priority</p>
                </div>
              </div>

              <div className="bg-slate-950/45 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/25">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Reliable Service</p>
                  <p className="text-[10px] text-slate-300 truncate">Trusted by many</p>
                </div>
              </div>

              <div className="bg-slate-950/45 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/25">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Pan India</p>
                  <p className="text-[10px] text-slate-300 truncate">Travel beyond borders</p>
                </div>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: FLOATING FROSTED GLASS LOGIN CARD ════ */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[430px] bg-white/75 backdrop-blur-2xl p-7 sm:p-9 rounded-[32px] border border-white/70 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] relative overflow-hidden">
              {/* Card Header with RK Emblem */}
              <div className="mb-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-blue-950 border border-slate-700/60 shadow-md shadow-slate-900/25 mb-2.5 mx-auto flex items-center justify-center p-2.5">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="cardRkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#1D4ED8" />
                      </linearGradient>
                      <linearGradient id="cardSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#94A3B8" />
                      </linearGradient>
                    </defs>
                    <path d="M22 15 L45 15 C60 15, 68 25, 68 38 C68 48, 60 56, 48 58 L72 85 L54 85 L35 60 L35 85 L22 85 Z" fill="url(#cardRkGrad)" />
                    <path d="M35 28 L45 28 C52 28, 55 32, 55 38 C55 44, 52 48, 45 48 L35 48 Z" fill="url(#cardSilverGrad)" />
                    <path d="M56 42 L80 15 L92 27 L68 54 Z" fill="url(#cardSilverGrad)" />
                  </svg>
                </div>

                <p className="text-xs font-bold tracking-widest text-slate-800 uppercase font-display">
                  RK TRAVEL HUB
                </p>
                <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase mt-0.5">
                  TRAVEL BEYOND BORDERS
                </p>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 font-display mt-3">
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

              {/* Success Alert */}
              {successMessage && (
                <div className="p-3 mb-4 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="leading-tight">{successMessage}</p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3 mb-4 bg-rose-50/90 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="leading-tight">{error}</p>
                </div>
              )}

              {/* Reset Password Mode */}
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
                        placeholder="ADMIN@GMAIL.COM"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full h-11 pl-10 pr-3.5 bg-[#EEF4FB]/80 hover:bg-[#EEF4FB] border border-slate-200/70 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-[#1A68F8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
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
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name / Display Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full h-11 pl-10 pr-3.5 bg-[#EEF4FB]/80 hover:bg-[#EEF4FB] border border-slate-200/70 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                        placeholder="ADMIN@GMAIL.COM"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full h-11 pl-10 pr-3.5 bg-[#EEF4FB]/80 hover:bg-[#EEF4FB] border border-slate-200/70 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
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
                        className="w-full h-11 pl-10 pr-10 bg-[#EEF4FB]/80 hover:bg-[#EEF4FB] border border-slate-200/70 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                    className="w-full h-11 bg-[#1A68F8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
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
                        placeholder="ADMIN@GMAIL.COM"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full h-11 pl-10 pr-3.5 bg-[#EEF4FB]/80 hover:bg-[#EEF4FB] border border-slate-200/70 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
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
                        className="w-full h-11 pl-10 pr-10 bg-[#EEF4FB]/80 hover:bg-[#EEF4FB] border border-slate-200/70 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
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
                    className="w-full h-11 bg-[#1A68F8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 mt-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
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

                  <div className="text-center pt-1.5">
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

              {/* Subtle OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300/60" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  <span className="bg-white/80 px-2 rounded-full">OR</span>
                </div>
              </div>

              {/* Bottom Security Pill inside card */}
              <div className="text-center flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-slate-200/80 rounded-full shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700">
                    Enterprise Fleet &amp; Operations Access Only
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom space/footer on mobile */}
        <div className="lg:hidden text-center text-xs text-white/60 py-2">
          © RK Travel Hub • Travel Beyond Borders
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
