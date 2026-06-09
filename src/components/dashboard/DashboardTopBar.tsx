"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, HelpCircle, Mail, Share2 } from "lucide-react";
import DashboardNotifications from "@/components/dashboard/DashboardNotifications";
import ThemeToggle from "@/components/ui/ThemeToggle";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/accounts": "Accounts",
  "/dashboard/analytics": "Analytics",
  "/dashboard/deposit": "Deposit",
  "/dashboard/withdrawals": "Withdraw",
  "/dashboard/investments": "Investments",
  "/dashboard/capital-markets": "Capital Markets",
  "/dashboard/settings": "Settings",
};

export default function DashboardTopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = titles[pathname] || "Dashboard";
  const initial = session?.user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header className="flex items-center justify-between gap-3 mb-6 pl-12 lg:pl-0 min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <div className="hidden sm:flex items-center gap-0.5 shrink-0">
          <button type="button" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors" aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors" aria-label="Forward">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="text-sm min-w-0 truncate">
          <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors hidden sm:inline">
            Blackrock Reserve
          </Link>
          <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors sm:hidden">
            BR
          </Link>
          <span className="mx-2 text-text-muted">›</span>
          <span className="text-text-primary font-medium">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <ThemeToggle size="sm" className="hidden sm:inline-flex" />
        <button type="button" className="hidden sm:flex p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors" aria-label="Help">
          <HelpCircle size={18} />
        </button>
        <button type="button" className="hidden sm:flex p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors" aria-label="Messages">
          <Mail size={18} />
        </button>
        <DashboardNotifications />
        <div className="h-9 w-9 rounded-full brand-gradient-bg flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10">
          {initial}
        </div>
        <button type="button" className="dash-share-btn hidden md:inline-flex ml-1">
          <Share2 size={15} />
          Share
        </button>
      </div>
    </header>
  );
}
