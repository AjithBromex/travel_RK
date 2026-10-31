"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Bus,
  Shield,
  Users,
  MapPin,
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
    if (user) {
      const destination = callbackUrl.startsWith("/travel")
        ? callbackUrl
        : "/travel";
      router.replace(destination);
    }
  }, [user, callbackUrl, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = userId.trim().replace(/@gmail\.com$/i, "").replace(/@.*$/, "").trim().toUpperCase();
    if (!cleanUsername) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("rk_login_username", cleanUsername);
      }
      await signIn(cleanUsername, password);
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
    const cleanUsername = userId.trim().replace(/@gmail\.com$/i, "").replace(/@.*$/, "").trim().toUpperCase();
    if (!cleanUsername) {
      setError("Please enter a username.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("rk_login_username", cleanUsername);
      }
      const email = `${cleanUsername.toLowerCase()}@gmail.com`;
      const name = displayName || cleanUsername;
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
    const cleanUsername = resetEmail.trim().replace(/@gmail\.com$/i, "").replace(/@.*$/, "").trim().toUpperCase();
    if (!cleanUsername) {
      setError("Please enter your username to reset your password.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const email = `${cleanUsername.toLowerCase()}@gmail.com`;
      await resetPassword(email);
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
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden selection:bg-blue-600/30 selection:text-white font-sans">
      {/* ─── 1. Cinematic Alpine Mountain Highway Background with Force Traveller ─── */}
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
        {/* Directional gradient overlay for maximum readability on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-slate-950/20 lg:from-slate-950/75 lg:via-slate-950/30 lg:to-transparent" />
      </div>

      {/* ─── 2. Responsive Canvas (Desktop Split & Mobile Stack) ─── */}
      <div className="relative z-10 w-full max-w-[1440px] min-h-screen mx-auto p-4 sm:p-6 lg:p-12 flex flex-col justify-between">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between pb-4">
          <div className="flex items-center gap-3 bg-slate-950/65 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-2xl shadow-xl">
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
              <p className="text-[8px] font-bold text-blue-200 tracking-[0.2em] uppercase">
                TRAVEL BEYOND BORDERS
              </p>
            </div>
          </div>
        </div>

        {/* Center Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-4 sm:py-8">
          {/* ══════════════ LEFT COLUMN: BRANDING & SHOWCASE (DESKTOP) ══════════════ */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-9 pr-6">
            {/* Top Left: Official 3D Metallic Emblem & Wordmark */}
            <div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-950/60 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-2xl p-2 relative group hover:border-blue-400/50 transition-colors">
                  <div className="relative w-full h-full">
                    <Image
                      src="/images/rk-logo.png"
                      alt="RK Monogram"
                      fill
                      priority
                      className="object-contain drop-shadow-[0_4px_12px_rgba(59,130,246,0.35)]"
                    />
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase drop-shadow-md">
                    RK TRAVEL HUB
                  </h1>
                  <p className="text-[11px] font-bold tracking-[0.28em] text-blue-200 uppercase drop-shadow mt-0.5">
                    TRAVEL BEYOND BORDERS
                  </p>
                </div>
              </div>
            </div>

            {/* Middle: Signature Headline & Slogan */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <h2 className="text-5xl lg:text-[68px] font-black italic text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] leading-[1.04]">
                  Safe Journeys
                </h2>
                <h2 className="text-5xl lg:text-[68px] font-black italic text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] leading-[1.04]">
                  Stronger
                </h2>
                <h2 className="text-5xl lg:text-[68px] font-black italic text-[#60A5FA] tracking-tight drop-shadow-[0_4px_20px_rgba(96,165,250,0.45)] leading-[1.04]">
                  Connections
                </h2>
              </div>

              {/* Tagline Divider */}
              <div className="flex items-center gap-3.5 pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60A5FA]" />
                  <div className="w-10 h-0.5 bg-blue-400/80 rounded-full" />
                </div>
                <p className="text-xs font-bold tracking-[0.25em] text-slate-100 uppercase drop-shadow">
                  COMFORT &nbsp;|&nbsp; SAFETY &nbsp;|&nbsp; RELIABILITY
                </p>
              </div>
            </div>

            {/* Bottom: 4 Key Value Feature Pills */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 pt-6">
              <div className="bg-slate-950/50 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl hover:border-white/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
                  <Bus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Modern Fleet</p>
                  <p className="text-[10px] text-slate-300 truncate">Well maintained vehicles</p>
                </div>
              </div>

              <div className="bg-slate-950/50 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl hover:border-white/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Safe Travel</p>
                  <p className="text-[10px] text-slate-300 truncate">Your safety, our priority</p>
                </div>
              </div>

              <div className="bg-slate-950/50 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl hover:border-white/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/30">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Reliable Service</p>
                  <p className="text-[10px] text-slate-300 truncate">Trusted by many</p>
                </div>
              </div>

              <div className="bg-slate-950/50 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl hover:border-white/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Pan India</p>
                  <p className="text-[10px] text-slate-300 truncate">Travel beyond borders</p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════ RIGHT COLUMN: TRANSLUCENT FROSTED GLASS LOGIN CARD ══════════════ */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[440px] bg-white/80 sm:bg-white/85 backdrop-blur-2xl p-7 sm:p-9 rounded-[36px] border border-white/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.4)] relative overflow-hidden transition-all">
              {/* Card Header with User's Official RK Logo */}
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
                <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase mt-0.5">
                  TRAVEL BEYOND BORDERS
                </p>

                <h2 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 mt-3">
                  {isResetMode
                    ? "Reset Password"
                    : isRegisterMode
                    ? "Create Account"
                    : "Travel Portal"}
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  {isResetMode
                    ? "Enter your username to receive reset instructions"
                    : isRegisterMode
                    ? "Create an administrator account for RK Travel Hub"
                    : "Enter your credentials to access the management portal"}
                </p>
              </div>

              {/* Feedback Alerts */}
              {successMessage && (
                <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-emerald-800 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="leading-tight">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-800 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="leading-tight">{error}</p>
                </div>
              )}

              {/* Reset Password Form */}
              {isResetMode ? (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Username
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="JAGAN"
                        value={resetEmail}
                        onChange={(e) => {
                          const val = e.target.value.replace(/@gmail\.com$/i, "").replace(/@.*$/, "").toUpperCase();
                          setResetEmail(val);
                        }}
                        className="w-full h-12 pl-11 pr-24 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 uppercase transition-all"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none select-none">
                        @gmail.com
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#1565D8] hover:bg-[#0D57C5] active:scale-[0.99] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
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
                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 pt-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              ) : isRegisterMode ? (
                /* Register Form */
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Username
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="JAGAN"
                        value={userId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/@gmail\.com$/i, "").replace(/@.*$/, "").toUpperCase();
                          setUserId(val);
                        }}
                        className="w-full h-11 pl-11 pr-24 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 uppercase transition-all"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none select-none">
                        @gmail.com
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                        className="w-full h-11 pl-11 pr-11 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
                      />
                      <button
                        type="button"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#1565D8] hover:bg-[#0D57C5] active:scale-[0.99] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
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
                      <span className="font-bold text-blue-600 hover:underline">
                        Sign In
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Main Sign In Form */
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Username
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        required
                        placeholder="JAGAN"
                        value={userId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/@gmail\.com$/i, "").replace(/@.*$/, "").toUpperCase();
                          setUserId(val);
                        }}
                        className="w-full h-12 pl-11 pr-24 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 uppercase transition-all"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none select-none">
                        @gmail.com
                      </span>
                    </div>
                  </div>

                  {/* Password & Forgot password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
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
                        className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
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
                        className="w-full h-12 pl-11 pr-11 bg-[#EEF4FB] hover:bg-[#E5EEF8] border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all"
                      />
                      <button
                        type="button"
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

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-[#1565D8] hover:bg-[#0D57C5] active:scale-[0.99] text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 mt-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.75]" />
                      </>
                    )}
                  </button>

                  {/* Need to set up access? Create Account */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setError("");
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Need to set up access?{" "}
                      <span className="font-bold text-blue-600 hover:underline">
                        Create Account
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300/70" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  <span className="bg-white/80 px-2.5 rounded-full">OR</span>
                </div>
              </div>

              {/* Enterprise Security Badge */}
              <div className="text-center flex items-center justify-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 border border-slate-200/80 rounded-full shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-700">
                    Enterprise Fleet &amp; Operations Access Only
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Value Badges */}
        <div className="lg:hidden grid grid-cols-2 gap-2 pt-4 pb-2">
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-xl p-2.5 flex items-center gap-2">
            <Bus className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">Modern Fleet</p>
              <p className="text-[9px] text-slate-300 truncate">Well maintained vehicles</p>
            </div>
          </div>
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-xl p-2.5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">Safe Travel</p>
              <p className="text-[9px] text-slate-300 truncate">Your safety, our priority</p>
            </div>
          </div>
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-xl p-2.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">Reliable Service</p>
              <p className="text-[9px] text-slate-300 truncate">Trusted by many</p>
            </div>
          </div>
          <div className="bg-slate-950/60 backdrop-blur-md border border-white/15 rounded-xl p-2.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">Pan India</p>
              <p className="text-[9px] text-slate-300 truncate">Travel beyond borders</p>
            </div>
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
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
