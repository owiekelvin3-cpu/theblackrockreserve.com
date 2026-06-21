"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, ArrowUpFromLine, Wallet,
  RefreshCw, Settings, Search, X, LineChart, Users, Landmark, LogOut, MessageCircle,
  Send, Receipt, CreditCard,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useDashboardLayout } from "@/components/dashboard/DashboardLayoutContext";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import UserDisplayName from "@/components/ui/UserDisplayName";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useI18n } from "@/components/providers/I18nProvider";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { useChat } from "@/components/providers/ChatProvider";
import { useFrozenAccount } from "@/components/dashboard/FrozenAccountProvider";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";

const mainNav = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, badge: null },
  { href: "/dashboard/deposit", labelKey: "nav.deposit", icon: Wallet, badge: null },
  { href: "/dashboard/transfer", labelKey: "nav.transfer", icon: Send, badge: null },
  { href: "/dashboard/withdrawals", labelKey: "nav.withdraw", icon: ArrowUpFromLine, badge: null },
  { href: "/dashboard/transactions", labelKey: "nav.transactions", icon: Receipt, badge: null },
  { href: "/dashboard/cards", labelKey: "nav.cards", icon: CreditCard, badge: null },
  { href: "/dashboard/analytics", labelKey: "nav.loans", icon: Landmark, badge: null },
  { href: "/dashboard/capital-markets", labelKey: "nav.markets", icon: LineChart, badge: null },
  { href: "/dashboard/joint-accounts", labelKey: "nav.jointAccounts", icon: Users, badge: null },
] as const;

const featureNav = [
  { href: "/dashboard/investments", labelKey: "nav.investments", icon: RefreshCw, badge: null },
  { href: "/dashboard/settings", labelKey: "common.settings", icon: Settings, badge: null },
] as const;

type NavItem = (typeof mainNav)[number] | (typeof featureNav)[number];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { sidebarOpen, closeSidebar, openSidebar } = useDashboardLayout();
  const { t } = useI18n();
  const { image: profileImage, verificationBadge } = useProfileImage();
  const { openChat, openHumanSupport } = useChat();
  const { isFrozen } = useFrozenAccount();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSidebar();
        window.setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSidebar]);

  const normalizedQuery = query.trim().toLowerCase();

  const matchesQuery = useMemo(() => {
    return (item: NavItem) => {
      if (!normalizedQuery) return true;
      const label = t(item.labelKey).toLowerCase();
      const href = item.href.toLowerCase();
      const segments = href.split("/").filter(Boolean);
      return (
        label.includes(normalizedQuery) ||
        href.includes(normalizedQuery) ||
        segments.some((s) => s.includes(normalizedQuery))
      );
    };
  }, [normalizedQuery, t]);

  const visibleMain = useMemo(() => mainNav.filter(matchesQuery), [matchesQuery]);
  const visibleFeature = useMemo(() => featureNav.filter(matchesQuery), [matchesQuery]);
  const hasQuery = normalizedQuery.length > 0;
  const showSupportChat =
    !hasQuery ||
    t("nav.supportChat").toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes("chat") ||
    normalizedQuery.includes("support");
  const noResults =
    hasQuery && visibleMain.length === 0 && visibleFeature.length === 0 && !showSupportChat;

  const goToFirstMatch = () => {
    const first = visibleMain[0] ?? visibleFeature[0];
    if (!first) return;
    setQuery("");
    closeSidebar();
    router.push(first.href);
  };

  const navLink = (item: NavItem) => {
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          setQuery("");
          closeSidebar();
        }}
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
          <Logo href="/dashboard" size="sm" className="min-w-0 flex-1" />
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5"
            onClick={closeSidebar}
            aria-label={t("dashboard.sidebar.closeMenu")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <label className="dash-search flex items-center gap-2 px-3 py-2.5 min-h-[44px] cursor-text">
            <Search size={15} className="text-text-muted shrink-0" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goToFirstMatch();
                }
              }}
              placeholder={t("dashboard.sidebar.searchPlaceholder")}
              aria-label={t("dashboard.sidebar.search")}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-muted"
            />
            <kbd className="hidden sm:inline text-[10px] text-text-muted bg-black/30 px-1.5 py-0.5 rounded border border-white/10 font-mono shrink-0">
              ⌘K
            </kbd>
          </label>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide overscroll-contain">
          {noResults ? (
            <p className="px-3 py-6 text-sm text-text-muted text-center">{t("common.noResults")}</p>
          ) : (
            <>
              {visibleMain.length > 0 && (
                <>
                  {!hasQuery && (
                    <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                      {t("dashboard.sidebar.main")}
                    </p>
                  )}
                  <div className="space-y-0.5 mb-6">
                    {visibleMain.map(navLink)}
                    {showSupportChat && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          closeSidebar();
                          if (isFrozen) openHumanSupport();
                          else openChat();
                        }}
                        className="dash-nav-item flex w-full items-center gap-3 px-3 py-3 text-sm font-medium min-h-[44px]"
                      >
                        <MessageCircle size={18} strokeWidth={1.75} />
                        <span className="flex-1 text-left">{t("nav.supportChat")}</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {visibleFeature.length > 0 && (
                <>
                  {!hasQuery && (
                    <p className="px-3 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                      {t("dashboard.sidebar.features")}
                    </p>
                  )}
                  <div className="space-y-0.5">{visibleFeature.map(navLink)}</div>
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5 safe-area-pb">
          <div className="mb-3 lg:hidden">
            <LanguageSelector variant="full" />
          </div>
          <div className="flex items-center gap-3 mb-3 px-1">
            <ProfileAvatar name={session?.user?.name} image={profileImage} size="md" />
            <div className="min-w-0 flex-1">
              <UserDisplayName
                name={session?.user?.name ?? t("common.account")}
                verificationBadge={verificationBadge}
                as="p"
                nameClassName="text-sm font-semibold text-text-primary truncate"
                badgeSize="xs"
              />
              <p className="text-xs text-text-muted truncate">{session?.user?.email}</p>
            </div>
          </div>
          <InstallAppPrompt variant="sidebar" className="mb-2" />
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
