"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart3, ArrowUpFromLine, FileText, Wallet,
  RefreshCw, MessageSquare, Search, Zap, Menu, X, LineChart, Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/dashboard/deposit", label: "Deposit", icon: Wallet, badge: null },
  { href: "/dashboard/withdrawals", label: "Withdraw", icon: ArrowUpFromLine, badge: null },
  { href: "/dashboard/accounts", label: "Accounts", icon: FileText, badge: null },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, badge: null },
  { href: "/dashboard/capital-markets", label: "Capital Markets", icon: LineChart, badge: null },
  { href: "/dashboard/joint-accounts", label: "Joint Accounts", icon: Users, badge: null },
];

const featureNav = [
  { href: "/dashboard/investments", label: "Investments", icon: RefreshCw, badge: null },
  { href: "/dashboard/settings", label: "Settings", icon: MessageSquare, badge: null },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-5 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg brand-gradient-bg flex items-center justify-center shadow-brand">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        <span className="text-base font-bold text-text-primary tracking-tight">
          Blackrock<span className="text-accent-brand">Reserve</span>
        </span>
      </div>

      <div className="px-4 mb-5">
        <div className="dash-search flex items-center gap-2 px-3 py-2.5">
          <Search size={15} className="text-text-muted shrink-0" />
          <span className="text-sm text-text-muted flex-1">Search</span>
          <kbd className="text-[10px] text-text-muted bg-black/30 px-1.5 py-0.5 rounded border border-white/10 font-mono">⌘K</kbd>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
        <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Main</p>
        <div className="space-y-0.5 mb-6">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "dash-nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
                  isActive && "dash-nav-item-active"
                )}
              >
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.75} />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && (
                  <span className="dash-nav-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Features</p>
        <div className="space-y-0.5">
          {featureNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "dash-nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
                  isActive && "dash-nav-item-active"
                )}
              >
                <item.icon size={18} strokeWidth={isActive ? 2 : 1.75} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[var(--dash-sidebar-bg)] border border-white/10 text-text-primary"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "dash-sidebar fixed left-0 top-0 h-screen w-[260px] flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
