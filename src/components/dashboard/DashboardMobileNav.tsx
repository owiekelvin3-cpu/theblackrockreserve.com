"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Landmark, CreditCard, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLayout } from "@/components/dashboard/DashboardLayoutContext";
import { useI18n } from "@/components/providers/I18nProvider";

const tabs = [
  { href: "/dashboard", labelKey: "nav.home", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  {
    href: "/dashboard/joint-accounts",
    labelKey: "nav.jointAccounts",
    icon: Users,
    match: (p: string) => p.startsWith("/dashboard/joint-accounts"),
  },
  {
    href: "/dashboard/analytics",
    labelKey: "nav.loans",
    icon: Landmark,
    match: (p: string) => p.startsWith("/dashboard/analytics") || p.startsWith("/dashboard/loans"),
  },
  {
    href: "/dashboard/cards",
    labelKey: "nav.cards",
    icon: CreditCard,
    match: (p: string) => p.startsWith("/dashboard/cards"),
  },
] as const;

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const { openSidebar, sidebarOpen } = useDashboardLayout();
  const { t } = useI18n();

  const moreActive =
    sidebarOpen ||
    (!tabs.some((tab) => tab.match(pathname)) &&
      pathname.startsWith("/dashboard") &&
      pathname !== "/dashboard");

  return (
    <nav
      className="dash-mobile-nav lg:hidden"
      aria-label={t("nav.menu")}
    >
      <div className="dash-mobile-nav-inner">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("dash-mobile-nav-item", active && "dash-mobile-nav-item-active")}
              aria-current={active ? "page" : undefined}
            >
              <tab.icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="dash-mobile-nav-label">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={openSidebar}
          className={cn("dash-mobile-nav-item", moreActive && "dash-mobile-nav-item-active")}
          aria-label={t("dashboard.sidebar.closeMenu")}
          aria-expanded={sidebarOpen}
        >
          <Menu size={20} strokeWidth={moreActive ? 2.25 : 1.75} aria-hidden />
          <span className="dash-mobile-nav-label">{t("nav.menu")}</span>
        </button>
      </div>
    </nav>
  );
}
