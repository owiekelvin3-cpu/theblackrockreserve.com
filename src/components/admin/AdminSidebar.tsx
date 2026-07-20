"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ArrowLeftRight, ShieldCheck,
  Mail, Building2, LogOut, ChevronRight, Bitcoin, Wallet,
  Settings, ArrowUpFromLine, Menu, X, LineChart, TrendingUp, DollarSign, Landmark, FileCheck, Receipt, BadgeCheck, CreditCard, Snowflake, Send,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAdminNotifications } from "@/components/admin/AdminNotificationsProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { LogoMark } from "@/components/layout/Logo";

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  countKey?: "pendingDeposits" | "pendingWithdrawals" | "pendingTransactions" | "pendingKyc" | "contactMessages" | "unreadSupportChats" | "pendingTaxVerifications" | "pendingLoans" | "pendingCardRequests" | "pendingFundReleaseRequests" | null;
};

const navGroups: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "admin.overview",
    items: [
      { href: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard, exact: true, countKey: null },
      { href: "/admin/users", labelKey: "admin.users", icon: Users, countKey: null },
      { href: "/admin/email-center", labelKey: "admin.emailCenter", icon: Send, countKey: null },
      { href: "/admin/frozen-accounts", labelKey: "admin.accountControls", icon: Snowflake, countKey: "pendingFundReleaseRequests" },
      { href: "/admin/verification-badges", labelKey: "admin.verificationBadges", icon: BadgeCheck, countKey: null },
    ],
  },
  {
    titleKey: "admin.money",
    items: [
      { href: "/admin/deposits", labelKey: "admin.deposits", icon: Bitcoin, countKey: "pendingDeposits" },
      { href: "/admin/withdrawals", labelKey: "admin.withdrawals", icon: ArrowUpFromLine, countKey: "pendingWithdrawals" },
      { href: "/admin/withdrawal-charges", labelKey: "admin.withdrawalCharges", icon: Receipt, countKey: null },
      { href: "/admin/profit-tax", labelKey: "admin.profitTax", icon: FileCheck, countKey: null },
      { href: "/admin/accounts", labelKey: "admin.accounts", icon: Building2, countKey: null },
      { href: "/admin/transactions", labelKey: "admin.transactions", icon: ArrowLeftRight, countKey: "pendingTransactions" },
      { href: "/admin/balance-adjustments", labelKey: "admin.adjustments", icon: Wallet, countKey: null },
      { href: "/admin/profit-management", labelKey: "admin.profit", icon: DollarSign, countKey: null },
    ],
  },
  {
    titleKey: "admin.markets",
    items: [
      { href: "/admin/market-assets", labelKey: "admin.marketAssets", icon: LineChart, countKey: null },
      { href: "/admin/investments", labelKey: "admin.investments", icon: TrendingUp, countKey: null },
    ],
  },
  {
    titleKey: "admin.review",
    items: [
      { href: "/admin/kyc", labelKey: "admin.kycReview", icon: ShieldCheck, countKey: "pendingKyc" },
      { href: "/admin/card-requests", labelKey: "admin.cardRequests", icon: CreditCard, countKey: "pendingCardRequests" },
      { href: "/admin/tax-verifications", labelKey: "admin.taxVerification", icon: FileCheck, countKey: "pendingTaxVerifications" },
      { href: "/admin/loans", labelKey: "admin.loanManagement", icon: Landmark, countKey: "pendingLoans" },
      { href: "/admin/messages", labelKey: "admin.messages", icon: Mail, countKey: "unreadSupportChats" },
      { href: "/admin/settings", labelKey: "admin.settings", icon: Settings, countKey: null },
    ],
  },
];

export default function AdminSidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: notificationData } = useAdminNotifications();
  const counts = notificationData;
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-4 sm:p-5 border-b border-white/10 shrink-0">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <LogoMark size="sm" className="rounded-xl" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">{t("admin.brand")}</p>
            <span className="admin-pill mt-0.5">{t("admin.badge")}</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-2 sm:p-3 overflow-y-auto admin-sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.titleKey} className="mb-3 last:mb-0">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
              {t(group.titleKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const badge = item.countKey && counts ? counts[item.countKey] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border-l-2 border-transparent",
                      active ? "admin-nav-active" : "text-[var(--admin-muted)] hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon size={17} strokeWidth={1.75} className="shrink-0" />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                    {badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="h-8 w-8 rounded-full brand-gradient-bg flex items-center justify-center text-xs font-bold text-white shadow-brand shrink-0">
            {session?.user?.name?.charAt(0) ?? "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-[10px] text-[var(--admin-muted)] truncate">{session?.user?.email}</p>
          </div>
        </div>
        <Link href="/" className="admin-btn-ghost w-full flex items-center justify-center gap-2 mb-2 text-xs">
          {t("admin.customerSite")} <ChevronRight size={12} />
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="admin-btn-ghost w-full flex items-center justify-center gap-2 text-xs text-[var(--admin-muted)]"
        >
          <LogOut size={14} /> {t("admin.signOut")}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[var(--admin-card)] border border-white/10 text-white shadow-lg"
        onClick={() => setOpen(!open)}
        aria-label={t("admin.toggleMenu")}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "admin-sidebar fixed inset-y-0 left-0 z-40 w-[min(280px,88vw)] flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:w-[240px]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
