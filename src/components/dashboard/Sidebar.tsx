"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Wallet, TrendingUp,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import Logo from "@/components/layout/Logo";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
  { href: "/dashboard/investments", label: "Investments", icon: TrendingUp },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarCollapsed, toggleSidebar } = useDashboardStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-black/80 backdrop-blur-xl border-r border-white/10 z-40 transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div className={cn("p-4 flex items-center", sidebarCollapsed ? "justify-center flex-col gap-3" : "justify-between")}>
        {!sidebarCollapsed && <Logo />}
        {sidebarCollapsed && (
          <div className="h-9 w-9 rounded-xl bg-accent-brand/20 border border-accent-brand/30 flex items-center justify-center">
            <span className="text-accent-brand font-bold text-sm">P</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-text-muted hover:text-accent-brand hover:bg-white/5 transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-accent-brand/15 text-accent-brand"
                  : "text-text-muted hover:text-white hover:bg-white/5",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        {!sidebarCollapsed && session?.user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
            <p className="text-xs text-text-muted truncate">{session.user.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-text-muted hover:text-accent-red hover:bg-accent-red/5 transition-colors",
            sidebarCollapsed && "justify-center"
          )}
        >
          <LogOut size={18} />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
