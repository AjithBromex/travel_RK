"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bus,
  MapPin,
  CreditCard,
  Settings,
} from "lucide-react";

export default function MobileBottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const userNavItems = [
    { name: "Dashboard", href: "/travel", icon: LayoutDashboard },
    { name: "Fleet", href: "/travel/vehicles", icon: Bus },
    { name: "Trips", href: "/travel/trips", icon: MapPin },
    { name: "Payments", href: "/travel/payments", icon: CreditCard },
    { name: "Settings", href: "/travel/settings", icon: Settings },
  ];

  const adminNavItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Fleet", href: "/admin/vehicles", icon: Bus },
    { name: "Trips", href: "/admin/trips", icon: MapPin },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const items = isAdmin ? adminNavItems : userNavItems;

  const isActive = (href: string) => {
    if (href === "/travel" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="xl:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] select-none"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center py-1 px-1 transition-all group ${
                active ? "text-[#0284C7]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-9 h-7 rounded-full transition-all ${
                  active ? "bg-sky-50 text-[#0284C7]" : "text-slate-500 group-hover:text-slate-700"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? "stroke-[2.4] scale-105" : "stroke-[1.8]"}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-all mt-0.5 ${
                  active ? "font-bold text-[#0284C7]" : "font-medium text-slate-500"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
