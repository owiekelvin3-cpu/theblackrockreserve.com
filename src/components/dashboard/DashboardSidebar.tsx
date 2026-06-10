"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, ArrowUpFromLine, Wallet,
  RefreshCw, MessageSquare, Search, Zap, X, LineChart, Users, Landmark, LogOut,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useDashboardLayout } from "@/components/dashboard/DashboardLayoutContext";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/dashboard/deposit", label: "Deposit", icon: Wallet, badge: null },
  { href: "/dashboard/withdrawals", label: "Withdraw", icon: ArrowUpFromLine, badge: null },
  { href: "/dashboard/analytics", label: "Loans", icon: Landmark, badge: null },
  { href: "/dashboard/capital-markets", label: "Capital Markets", icon: LineChart, badge: null },
  { href: "/dashboard/joint-accounts", label: "Joint Accounts", icon: Users, badge: null },
];

const featureNav = [
  { href: "/dashboard/investments", label: "Investments", icon: RefreshCw, badge: null },
  { href: "/dashboard/settings", label: "Settings", icon: MessageSquare, badge: null },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, closeSidebar } = useDashboardLayout();
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() ?? "?";

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const navLink = (item: (typeof mainNav)[number]) => {
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={cn(
          "dash-nav-item flex items-center gap-3 px-3 py-3 text-sm font-medium min-h-[44px]",
          isActive && "dash-nav-item-active"
        )}
      >
        <item.icon size={18} strokeWidth={isActive ? 2 : 1.75} />
        <span className="flex-1">{item.label}</span>
        {item.badge != null && <span className="dash-nav-badge">{item.badge}</span>}
      </Link>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/65 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          "dash-sidebar fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(300px,88vw)] flex-col transition-transform duration-300 ease-out lg:z-40 lg:w-[260px]",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-2 p-4 sm:p-5 border-b border-white/5 lg:border-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg brand-gradient-bg flex items-center justify-center shadow-brand shrink-0">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <span className="text-base font-bold text-text-primary tracking-tight truncate">
              Blackrock<span className="text-accent-brand">Reserve</span>
            </span>
          </div>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="dash-search flex items-center gap-2 px-3 py-2.5 min-h-[44px]">
            <Search size={15} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-muted flex-1">Search</span>
            <kbd className="hidden sm:inline text-[10px] text-text-muted bg-black/30 px-1.5 py-0.5 rounded border border-white/10 font-mono">⌘K</kbd>
          </div>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide overscroll-contain">
          <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Main</p>
          <div className="space-y-0.5 mb-6">{mainNav.map(navLink)}</div>

          <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">Features</p>
          <div className="space-y-0.5">{featureNav.map(navLink)}</div>
        </nav>

        <div className="p-4 border-t border-white/5 safe-area-pb">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-10 w-10 rounded-full brand-gradient-bg flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10 shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">{session?.user?.name ?? "Account"}</p>
              <p className="text-xs text-text-muted truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="dash-nav-item flex w-full items-center gap-3 px-3 py-3 text-sm font-medium min-h-[44px] text-text-secondary hover:text-accent-red"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
