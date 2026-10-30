"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 relative selection:bg-blue-600/10 selection:text-blue-600">
      {/* High-Performance Hardware-Accelerated Ambient Light Background with Subtle Travel Grid */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Soft radial glow orbs */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `
              radial-gradient(circle 800px at 80% 5%, rgba(224, 238, 255, 0.75), transparent 70%),
              radial-gradient(circle 700px at 10% 25%, rgba(243, 232, 255, 0.45), transparent 70%),
              radial-gradient(circle 900px at 75% 85%, rgba(220, 252, 231, 0.4), transparent 70%),
              radial-gradient(circle 600px at 20% 90%, rgba(238, 242, 255, 0.5), transparent 70%)
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

      {/* Mobile drawer */}
      <div className="lg:hidden">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="w-full flex flex-col min-h-screen">
        <Topbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 min-h-[calc(100vh-80px)] max-w-[1560px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
