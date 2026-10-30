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
    if (!userId.trim()) {
      setError("Please enter your User ID or Email.");
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
    <div className="relative min-h-screen w-full bg-[#0A1628] flex items-center justify-center overflow-hidden selection:bg-blue-600/30 selection:text-white font-sans">
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP VIEW (>= 1024px): Pixel-Perfect 16:9 Canvas Matching Mockup
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex relative w-full h-screen items-center justify-center">
        {/* Ambient atmospheric blurred backdrop extending beyond 16:9 */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-110 opacity-70 pointer-events-none"
          style={{ backgroundImage: `url('/images/login-mockup-hd.jpg')` }}
        />
        <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />

        {/* The Exact 16:9 Canvas Container */}
        <div className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw] aspect-[16/9] shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Base Mockup Image: Exactly the User's Image */}
          <Image
            src="/images/login-mockup-hd.jpg"
            alt="RK Travel Hub Login"
            fill
            priority
            className="object-cover object-center select-none"
          />

          {/* ═════════════════════════════════════════════════════════
              INTERACTIVE FROSTED GLASS PORTAL CARD OVERLAY
              Mapped with 100% precision to the right card:
              left: 61.62%, top: 9.03%, width: 32.71%, height: 82.64%
              ═════════════════════════════════════════════════════════ */}
          <div
            className="absolute z-20"
            style={{
              left: "61.62%",
              top: "9.03%",
              width: "32.71%",
              height: "82.64%",
            }}
          >
            {/* When in Reset Mode or Register Mode: Render full opaque frosted card */}
            {isResetMode || isRegisterMode ? (
              <div className="w-full h-full bg-white/95 backdrop-blur-3xl rounded-[clamp(20px,2.2vw,36px)] border border-white p-[6%] shadow-2xl flex flex-col justify-between overflow-y-auto">
                <div>
                  {/* Card Header */}
                  <div className="text-center mb-[5%]">
                    <div className="w-[18%] aspect-square max-w-[64px] mx-auto mb-[2%] relative">
                      <Image
                        src="/images/rk-logo-card.png"
                        alt="RK Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-[clamp(9px,0.75vw,11px)] font-bold tracking-widest text-slate-800 uppercase">
                      RK TRAVEL HUB
                    </p>
                    <p className="text-[clamp(7px,0.55vw,9px)] font-bold tracking-[0.2em] text-slate-500 uppercase">
                      TRAVEL BEYOND BORDERS
                    </p>

                    <h2 className="text-[clamp(16px,1.5vw,22px)] font-black text-slate-900 mt-[3%]">
                      {isResetMode ? "Reset Password" : "Create Account"}
                    </h2>
                    <p className="text-[clamp(10px,0.75vw,12px)] text-slate-500 mt-[1%]">
                      {isResetMode
                        ? "Enter your User ID or email to receive reset instructions"
                        : "Create an administrator account for RK Travel Hub"}
                    </p>
                  </div>

                  {/* Feedback Alerts */}
                  {error && (
                    <div className="p-[3%] mb-[4%] bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-[clamp(10px,0.75vw,12px)] text-rose-700 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <p className="leading-tight">{error}</p>
                    </div>
                  )}
                  {successMessage && (
                    <div className="p-[3%] mb-[4%] bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-[clamp(10px,0.75vw,12px)] text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <p className="leading-tight">{successMessage}</p>
                    </div>
                  )}

                  {/* Reset Password Form */}
                  {isResetMode ? (
                    <form onSubmit={handlePasswordReset} className="space-y-[4%]">
                      <div>
                        <label className="block text-[clamp(10px,0.75vw,12px)] font-bold text-slate-700 mb-[1.5%]">
                          User ID / Email
                        </label>
                        <div className="relative">
                          <User className="absolute left-[4%] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="ADMIN@GMAIL.COM"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full h-[clamp(34px,2.6vw,42px)] pl-[12%] pr-[4%] bg-[#EEF4FB] border border-[#D5E3F3] rounded-[clamp(10px,0.9vw,14px)] text-[clamp(11px,0.85vw,13px)] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-[clamp(38px,3vw,48px)] bg-[#0D62FE] hover:bg-[#0952DC] text-white rounded-[clamp(12px,1vw,16px)] text-[clamp(12px,0.9vw,14px)] font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
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
                        className="w-full text-center text-[clamp(10px,0.75vw,12px)] font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 pt-[2%] cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Sign In</span>
                      </button>
                    </form>
                  ) : (
                    /* Register Form */
                    <form onSubmit={handleRegister} className="space-y-[3.5%]">
                      <div>
                        <label className="block text-[clamp(10px,0.75vw,12px)] font-bold text-slate-700 mb-[1%]">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-[4%] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full h-[clamp(32px,2.4vw,38px)] pl-[12%] pr-[4%] bg-[#EEF4FB] border border-[#D5E3F3] rounded-[clamp(10px,0.8vw,12px)] text-[clamp(11px,0.8vw,13px)] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[clamp(10px,0.75vw,12px)] font-bold text-slate-700 mb-[1%]">
                          User ID / Email
                        </label>
                        <div className="relative">
                          <User className="absolute left-[4%] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="ADMIN@GMAIL.COM"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full h-[clamp(32px,2.4vw,38px)] pl-[12%] pr-[4%] bg-[#EEF4FB] border border-[#D5E3F3] rounded-[clamp(10px,0.8vw,12px)] text-[clamp(11px,0.8vw,13px)] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[clamp(10px,0.75vw,12px)] font-bold text-slate-700 mb-[1%]">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-[4%] top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="Minimum 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-[clamp(32px,2.4vw,38px)] pl-[12%] pr-[12%] bg-[#EEF4FB] border border-[#D5E3F3] rounded-[clamp(10px,0.8vw,12px)] text-[clamp(11px,0.8vw,13px)] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-[4%] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                        className="w-full h-[clamp(36px,2.8vw,44px)] bg-[#0D62FE] hover:bg-[#0952DC] text-white rounded-[clamp(12px,0.9vw,14px)] text-[clamp(12px,0.85vw,14px)] font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 mt-[2%]"
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

                      <div className="text-center pt-[1%]">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegisterMode(false);
                            setError("");
                          }}
                          className="text-[clamp(10px,0.75vw,12px)] text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Already have an account?{" "}
                          <span className="font-bold text-blue-600 hover:underline">
                            Sign In
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* Normal Sign In Mode: Precision Overlay on Mockup Card */
              <div className="relative w-full h-full">
                {/* Floating Notification / Error Banner */}
                {error && (
                  <div className="absolute left-[9.55%] right-[9.26%] top-[37%] z-30 p-[2.5%] bg-rose-50/95 border border-rose-200/90 rounded-xl flex items-center gap-2 text-[clamp(10px,0.72vw,12px)] text-rose-800 font-semibold shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <p className="leading-tight truncate">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="absolute left-[9.55%] right-[9.26%] top-[37%] z-30 p-[2.5%] bg-emerald-50/95 border border-emerald-200/90 rounded-xl flex items-center gap-2 text-[clamp(10px,0.72vw,12px)] text-emerald-800 font-semibold shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <p className="leading-tight truncate">{successMessage}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="w-full h-full">
                  {/* 1. User ID / Email Input Box */}
                  <div
                    className="absolute"
                    style={{
                      left: "9.55%",
                      top: "46.01%",
                      width: "81.19%",
                      height: "7.98%",
                    }}
                  >
                    <div className="relative w-full h-full">
                      <User className="absolute left-[4%] top-1/2 -translate-y-1/2 w-[clamp(14px,1vw,18px)] h-[clamp(14px,1vw,18px)] text-slate-500/80 pointer-events-none z-10" />
                      <input
                        type="text"
                        required
                        value={userId}
                        onChange={(e) => {
                          setUserId(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="ADMIN@GMAIL.COM"
                        className="w-full h-full pl-[12%] pr-[4%] bg-[#EEF4FB] text-slate-900 font-semibold text-[clamp(11px,0.85vw,14px)] rounded-[clamp(8px,0.8vw,14px)] border border-[#D5E3F3] focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none uppercase placeholder:text-slate-400/90 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* 2. Forgot Password Clickable Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError("");
                      setSuccessMessage("");
                      setResetEmail(userId);
                    }}
                    className="absolute right-[9.55%] top-[55.0%] text-[clamp(9px,0.72vw,12px)] font-bold text-[#1E70F5] hover:text-blue-700 hover:underline cursor-pointer transition-colors z-20"
                  >
                    Forgot password?
                  </button>

                  {/* 3. Password Input Box */}
                  <div
                    className="absolute"
                    style={{
                      left: "9.55%",
                      top: "58.40%",
                      width: "81.19%",
                      height: "7.98%",
                    }}
                  >
                    <div className="relative w-full h-full">
                      <Lock className="absolute left-[4%] top-1/2 -translate-y-1/2 w-[clamp(14px,1vw,18px)] h-[clamp(14px,1vw,18px)] text-slate-500/80 pointer-events-none z-10" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="••••••••"
                        className="w-full h-full pl-[12%] pr-[12%] bg-[#EEF4FB] text-slate-900 font-semibold text-[clamp(11px,0.85vw,14px)] rounded-[clamp(8px,0.8vw,14px)] border border-[#D5E3F3] focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none placeholder:text-slate-400/90 transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-[4%] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      >
                        {showPassword ? (
                          <EyeOff className="w-[clamp(13px,0.9vw,16px)] h-[clamp(13px,0.9vw,16px)]" />
                        ) : (
                          <Eye className="w-[clamp(13px,0.9vw,16px)] h-[clamp(13px,0.9vw,16px)]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 4. Sign In Button */}
                  <div
                    className="absolute"
                    style={{
                      left: "9.55%",
                      top: "68.91%",
                      width: "81.19%",
                      height: "12.18%",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-full bg-[#0D62FE] hover:bg-[#0952DC] active:scale-[0.99] text-white font-bold text-[clamp(13px,1vw,16px)] rounded-[clamp(12px,1.2vw,20px)] shadow-[0_8px_20px_rgba(13,98,254,0.35)] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ChevronRight className="w-[clamp(16px,1.2vw,20px)] h-[clamp(16px,1.2vw,20px)] stroke-[2.75]" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* 5. Need to set up access? Create Account Link */}
                  <div
                    className="absolute text-center"
                    style={{
                      left: "0%",
                      top: "83.19%",
                      width: "100%",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-[clamp(10px,0.72vw,12px)] text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                    >
                      Need to set up access?{" "}
                      <span className="font-bold text-[#1E70F5] hover:underline">
                        Create Account
                      </span>
                    </button>
                  </div>

                  {/* 6. Bottom Badge: Enterprise Fleet & Operations Access Only */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      left: "0%",
                      top: "92.02%",
                      width: "100%",
                    }}
                  >
                    <div className="inline-flex items-center gap-1.5 px-[3.5%] py-[1.2%] bg-white/80 border border-slate-200/80 rounded-full shadow-2xs backdrop-blur-md">
                      <ShieldCheck className="w-[clamp(11px,0.8vw,14px)] h-[clamp(11px,0.8vw,14px)] text-emerald-600 shrink-0" />
                      <span className="text-[clamp(8px,0.65vw,10.5px)] font-bold text-slate-700 tracking-tight whitespace-nowrap">
                        Enterprise Fleet &amp; Operations Access Only
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE & TABLET VIEW (< 1024px): Seamless Vertical Experience
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
        {/* Mobile Background */}
        <div className="fixed inset-0 -z-10">
          <Image
            src="/images/login-mockup-hd.jpg"
            alt="RK Travel Background"
            fill
            priority
            className="object-cover object-[35%_center]"
          />
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" />
        </div>

        {/* Top Logo */}
        <div className="w-full flex items-center justify-center pt-3 pb-4">
          <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl shadow-xl">
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/images/rk-logo-card.png"
                alt="RK Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-black text-white tracking-widest uppercase">
                RK TRAVEL HUB
              </p>
              <p className="text-[8px] font-bold text-blue-300 tracking-[0.2em] uppercase">
                TRAVEL BEYOND BORDERS
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Card */}
        <div className="w-full max-w-sm mx-auto my-auto bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/80 p-6 shadow-2xl">
          <div className="text-center mb-5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isResetMode
                ? "Reset Password"
                : isRegisterMode
                ? "Create Account"
                : "Travel Portal"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isResetMode
                ? "Enter your User ID or email to receive reset instructions"
                : isRegisterMode
                ? "Create an administrator account for RK Travel Hub"
                : "Enter your credentials to access the management portal"}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <p className="leading-tight">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <p className="leading-tight">{successMessage}</p>
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  User ID / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="ADMIN@GMAIL.COM"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 bg-[#EEF4FB] border border-[#D5E3F3] rounded-xl text-xs font-semibold text-slate-900 uppercase outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#0D62FE] hover:bg-[#0952DC] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
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
                className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-900 pt-1 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          ) : isRegisterMode ? (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 bg-[#EEF4FB] border border-[#D5E3F3] rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User ID / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="ADMIN@GMAIL.COM"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 bg-[#EEF4FB] border border-[#D5E3F3] rounded-xl text-xs font-semibold text-slate-900 uppercase outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 bg-[#EEF4FB] border border-[#D5E3F3] rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="w-full h-11 bg-[#0D62FE] hover:bg-[#0952DC] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
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

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Already have an account?{" "}
                  <span className="font-bold text-blue-600 hover:underline">
                    Sign In
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  User ID / Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="ADMIN@GMAIL.COM"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-[#EEF4FB] border border-[#D5E3F3] rounded-xl text-xs font-semibold text-slate-900 uppercase outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

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
                    className="text-xs font-bold text-[#1E70F5] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-10 bg-[#EEF4FB] border border-[#D5E3F3] rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="w-full h-12 bg-[#0D62FE] hover:bg-[#0952DC] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/30 transition-all cursor-pointer"
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

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError("");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Need to set up access?{" "}
                  <span className="font-bold text-[#1E70F5] hover:underline">
                    Create Account
                  </span>
                </button>
              </div>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                  <span className="bg-white/90 px-2 rounded-full">OR</span>
                </div>
              </div>

              <div className="text-center flex items-center justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 border border-slate-200 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold text-slate-700">
                    Enterprise Fleet &amp; Operations Access Only
                  </span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Mobile Bottom Value Pills */}
        <div className="grid grid-cols-2 gap-2 pt-4 pb-2">
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
        <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
