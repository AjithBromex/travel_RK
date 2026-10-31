"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import {
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Users,
  FileText,
  ArrowUpRight,
  Loader2,
  Lock,
} from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string>("admin@gmail.com")

  // Check admin session verification on mount
  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/admin/verify")
        if (res.ok) {
          const data = await res.json()
          if (data.email) {
            setSessionEmail(data.email)
          }
        }
      } catch {
        // middleware handles redirection if unauthenticated
      }
    }
    verify()
  }, [])

  // Requirement g: Visible "Sign out" button that revokes session cookie and refresh tokens
  const handleSignOut = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      // 1. Server-side logout: revokes refresh tokens & clears firebase_admin_session cookie
      await fetch("/api/admin/logout", {
        method: "POST",
      })

      // 2. Client-side Firebase sign-out
      await signOut(auth).catch(() => {})

      // 3. Redirect directly to admin login (Requirement b & g)
      window.location.replace("/admin/login")
    } catch (err) {
      console.error("Sign out error:", err)
      window.location.replace("/admin/login")
    }
  }

  // If this is the login page, render children directly
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  const navItems = [
    { name: "Overview & Controls", href: "/admin", icon: LayoutDashboard },
    { name: "Travel Operations Portal", href: "/travel", icon: ArrowUpRight, external: true },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30">
      {/* ─── Top Administrator Command Bar ─── */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Branding & Role Badge */}
          <div className="flex items-center gap-3.5">
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 rounded-xl bg-slate-800 border border-white/10 p-1 flex items-center justify-center shadow group-hover:border-rose-400/40 transition-colors">
                <Image
                  src="/images/rk-logo.png"
                  alt="RK Logo"
                  fill
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white tracking-wider uppercase">
                    RK TRAVEL HUB
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 text-rose-400" />
                    Admin Console
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider">
                  MASTER CONTROLLER &bull; STRICT ACCESS
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right: Authenticated Admin Pill & Requirement g: Visible "Sign out" button */}
          <div className="flex items-center gap-3">
            {/* Admin identity badge */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold uppercase leading-tight">
                  Logged in as
                </span>
                <span className="font-bold text-white leading-tight">
                  {sessionEmail}
                </span>
              </div>
            </div>

            {/* Requirement g: Visible "Sign out" button */}
            <button
              id="admin-signout-btn"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
              title="Sign out and revoke admin session tokens"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          RK Travel Hub Administrative System &bull; Active Token Expiry: 1 Hour &bull; Security Claim:{" "}
          <span className="text-emerald-400 font-bold">admin: true</span>
        </p>
      </footer>
    </div>
  )
}
