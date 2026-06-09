"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart3, ArrowUpFromLine, FileText, Wallet,
  RefreshCw, MessageSquare, Search, Zap, Menu, X, LineChart,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/deposit", label: "Deposit", icon: Wallet },
  { href: "/dashboard/withdrawals", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/dashboard/accounts", label: "Accounts", icon: FileText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/capital-markets", label: "Capital Markets", icon: LineChart },
];

const featureNav = [
  { href: "/dashboard/investments", label: "Investments", icon: RefreshCw },
  { href: "/dashboard/settings", label: "Settings", icon: MessageSquare },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-5 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl brand-gradient-bg flex items-center justify-center shadow-brand">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Blackrock<span className="text-accent-brand">Reserve</span>
        </span>
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-primary border border-white/10">
          <Search size={16} className="text-text-secondary shrink-0" />
          <span className="text-sm text-text-secondary flex-1">Search</span>
          <kbd className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
        <p className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Main</p>
        <div className="space-y-0.5 mb-6">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-bg-primary text-white" : "text-text-secondary hover:text-white hover:bg-bg-primary/50"
                )}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <p className="px-3 mb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Features</p>
        <div className="space-y-0.5">
          {featureNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-bg-primary text-white" : "text-text-secondary hover:text-white hover:bg-bg-primary/50"
                )}
              >
                <item.icon size={18} />
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
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-bg-tertiary border border-white/10 text-white"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-[260px] dash-sidebar flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
