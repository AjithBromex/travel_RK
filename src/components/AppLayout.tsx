"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 relative selection:bg-blue-600/10 selection:text-blue-600">
      {/* High-Performance Hardware-Accelerated Ambient Light Background */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(circle 600px at 75% 10%, rgba(219, 234, 254, 0.5), transparent 70%),
            radial-gradient(circle 500px at 15% 35%, rgba(243, 232, 255, 0.4), transparent 70%),
            radial-gradient(circle 500px at 85% 85%, rgba(209, 250, 229, 0.35), transparent 70%)
          `,
        }}
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content area */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        }`}
      >
        <Topbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-68px)] max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
