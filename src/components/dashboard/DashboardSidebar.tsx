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
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useI18n } from "@/components/providers/I18nProvider";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";

const mainNav = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, badge: null },
  { href: "/dashboard/deposit", labelKey: "nav.deposit", icon: Wallet, badge: null },
  { href: "/dashboard/withdrawals", labelKey: "nav.withdraw", icon: ArrowUpFromLine, badge: null },
  { href: "/dashboard/analytics", labelKey: "nav.loans", icon: Landmark, badge: null },
  { href: "/dashboard/capital-markets", labelKey: "nav.markets", icon: LineChart, badge: null },
  { href: "/dashboard/joint-accounts", labelKey: "nav.jointAccounts", icon: Users, badge: null },
] as const;

const featureNav = [
  { href: "/dashboard/investments", labelKey: "nav.investments", icon: RefreshCw, badge: null },
  { href: "/dashboard/settings", labelKey: "common.settings", icon: MessageSquare, badge: null },
] as const;

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, closeSidebar } = useDashboardLayout();
  const { t } = useI18n();
  const { image: profileImage } = useProfileImage();

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  type NavItem = (typeof mainNav)[number] | (typeof featureNav)[number];

  const navLink = (item: NavItem) => {
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
        <span className="flex-1">{t(item.labelKey)}</span>
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
          <div className="mb-3 lg:hidden">
            <LanguageSelector variant="full" />
          </div>
          <div className="flex items-center gap-3 mb-3 px-1">
            <ProfileAvatar name={session?.user?.name} image={profileImage} size="md" />
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
            {t("common.signOut")}
          </button>
        </div>
      </aside>
    </>
  );
}
