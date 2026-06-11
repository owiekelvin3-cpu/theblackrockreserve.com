"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HelpCircle } from "lucide-react";
import DashboardNotifications from "@/components/dashboard/DashboardNotifications";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import { useI18n } from "@/components/providers/I18nProvider";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { cn } from "@/lib/utils";

const titleKeys: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/dashboard/analytics": "nav.loans",
  "/dashboard/deposit": "nav.deposit",
  "/dashboard/withdrawals": "nav.withdraw",
  "/dashboard/investments": "nav.investments",
  "/dashboard/capital-markets": "nav.markets",
  "/dashboard/joint-accounts": "nav.jointAccounts",
  "/dashboard/settings": "common.settings",
};

function resolveTitleKey(pathname: string) {
  if (titleKeys[pathname]) return titleKeys[pathname];
  if (pathname.startsWith("/dashboard/joint-accounts/")) return "nav.jointAccounts";
  return "nav.dashboard";
}

export default function DashboardTopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();
  const { image: profileImage } = useProfileImage();
  const title = t(resolveTitleKey(pathname));
  const isOverview = pathname === "/dashboard";

  return (
    <header
      className={cn(
        "dash-sticky-header -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 sticky top-0 z-30 pt-[env(safe-area-inset-top)]",
        isOverview ? "mb-2 lg:mb-6" : "mb-4 sm:mb-6"
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0 py-2 sm:py-0">
        {isOverview ? (
          <p className="text-sm font-semibold text-text-primary truncate min-w-0 flex-1">
            {t("brand.name")}
          </p>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider truncate">
              {t("brand.name")}
            </p>
            <h1 className="text-base sm:text-lg font-semibold text-text-primary truncate leading-tight">
              {title}
            </h1>
          </div>
        )}

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <LanguageSelector className="hidden sm:block" />
          <ThemeToggle size="sm" />
          <Link
            href="/contact"
            className="hidden sm:flex p-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
            aria-label={t("common.help")}
          >
            <HelpCircle size={18} />
          </Link>
          <DashboardNotifications />
          <Link href="/dashboard/settings" aria-label={t("common.settings")}>
            <ProfileAvatar name={session?.user?.name} image={profileImage} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
