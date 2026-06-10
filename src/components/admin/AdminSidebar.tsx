"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Mail, Building2, LogOut, ChevronRight, Bitcoin, Wallet,
  ScrollText, Settings, ArrowUpFromLine, Menu, X, LineChart, TrendingUp,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAdminNotifications } from "@/components/admin/AdminNotificationsProvider";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, countKey: null },
  { href: "/admin/users", label: "Users", icon: Users, countKey: null },
  { href: "/admin/deposits", label: "Deposit Management", icon: Bitcoin, countKey: "pendingDeposits" as const },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, countKey: "pendingWithdrawals" as const },
  { href: "/admin/accounts", label: "Accounts", icon: Building2, countKey: null },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight, countKey: "pendingTransactions" as const },
  { href: "/admin/market-assets", label: "Market Assets", icon: LineChart, countKey: null },
  { href: "/admin/investments", label: "Investments", icon: TrendingUp, countKey: null },
  { href: "/admin/balance-adjustments", label: "Adjustments", icon: Wallet, countKey: null },
  { href: "/admin/kyc", label: "KYC Review", icon: ShieldCheck, countKey: "pendingKyc" as const },
  { href: "/admin/messages", label: "Messages", icon: Mail, countKey: "contactMessages" as const },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText, countKey: null },
  { href: "/admin/settings", label: "Settings", icon: Settings, countKey: null },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: notificationData } = useAdminNotifications();
  const counts = notificationData;
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <div className="h-9 w-9 rounded-xl brand-gradient-bg flex items-center justify-center text-white font-bold text-sm shadow-brand">
            BR
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Blackrock Reserve</p>
            <span className="admin-pill mt-0.5">Admin · Live</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const badge = item.countKey && counts ? counts[item.countKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border-l-2 border-transparent",
                active ? "admin-nav-active" : "text-[var(--admin-muted)] hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="h-8 w-8 rounded-full brand-gradient-bg flex items-center justify-center text-xs font-bold text-white shadow-brand">
            {session?.user?.name?.charAt(0) ?? "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-[10px] text-[var(--admin-muted)] truncate">{session?.user?.email}</p>
          </div>
        </div>
        <Link href="/" className="admin-btn-ghost w-full flex items-center justify-center gap-2 mb-2 text-xs">
          Customer Site <ChevronRight size={12} />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="admin-btn-ghost w-full flex items-center justify-center gap-2 text-xs text-[var(--admin-muted)]"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-[var(--admin-card)] border border-white/10 text-white"
        onClick={() => setOpen(!open)}
        aria-label="Toggle admin menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "admin-sidebar fixed inset-y-0 left-0 z-40 w-[240px] flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
