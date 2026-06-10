"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Wallet, ArrowUpFromLine, LineChart, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLayout } from "@/components/dashboard/DashboardLayoutContext";
import { useI18n } from "@/components/providers/I18nProvider";

const tabs = [
  { href: "/dashboard", labelKey: "nav.home", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/deposit", labelKey: "nav.deposit", icon: Wallet, match: (p: string) => p.startsWith("/dashboard/deposit") },
  { href: "/dashboard/withdrawals", labelKey: "nav.withdraw", icon: ArrowUpFromLine, match: (p: string) => p.startsWith("/dashboard/withdrawals") },
  { href: "/dashboard/capital-markets", labelKey: "nav.markets", icon: LineChart, match: (p: string) => p.startsWith("/dashboard/capital-markets") },
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
            >
              <span className="dash-mobile-nav-icon-wrap">
                <tab.icon size={21} strokeWidth={active ? 2.25 : 1.75} />
                {active && <span className="dash-mobile-nav-dot" aria-hidden />}
              </span>
              <span>{t(tab.labelKey)}</span>
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
          <span className="dash-mobile-nav-icon-wrap">
            <Menu size={21} strokeWidth={moreActive ? 2.25 : 1.75} />
            {moreActive && <span className="dash-mobile-nav-dot" aria-hidden />}
          </span>
          <span>{t("nav.menu")}</span>
        </button>
      </div>
    </nav>
  );
}
