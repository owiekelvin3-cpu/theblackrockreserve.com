"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { HelpCircle } from "lucide-react";
import DashboardNotifications from "@/components/dashboard/DashboardNotifications";
import ThemeToggle from "@/components/ui/ThemeToggle";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/analytics": "Loans",
  "/dashboard/deposit": "Deposit",
  "/dashboard/withdrawals": "Withdraw",
  "/dashboard/investments": "Investments",
  "/dashboard/capital-markets": "Capital Markets",
  "/dashboard/joint-accounts": "Joint Accounts",
  "/dashboard/settings": "Settings",
};

function resolveTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/dashboard/joint-accounts/")) return "Joint Account";
  return "Dashboard";
}

export default function DashboardTopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = resolveTitle(pathname);
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header className="dash-sticky-header -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 mb-4 sm:mb-6 sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0 py-2 sm:py-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-medium text-text-muted uppercase tracking-wider truncate">
            Blackrock Reserve
          </p>
          <h1 className="text-base sm:text-lg font-semibold text-text-primary truncate leading-tight">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <ThemeToggle size="sm" />
          <Link
            href="/contact"
            className="hidden sm:flex p-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
            aria-label="Help"
          >
            <HelpCircle size={18} />
          </Link>
          <DashboardNotifications />
          <Link
            href="/dashboard/settings"
            className="h-10 w-10 sm:h-9 sm:w-9 rounded-full brand-gradient-bg flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10 shrink-0"
            aria-label="Account settings"
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
