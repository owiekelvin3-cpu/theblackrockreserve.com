"use client";

import Link from "next/link";
import { Wallet, ArrowUpFromLine, LineChart, TrendingUp } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

const actions = [
  { href: "/dashboard/deposit", labelKey: "nav.deposit", icon: Wallet },
  { href: "/dashboard/withdrawals", labelKey: "nav.withdraw", icon: ArrowUpFromLine },
  { href: "/dashboard/capital-markets", labelKey: "nav.markets", icon: LineChart },
  { href: "/dashboard/investments", labelKey: "nav.investments", icon: TrendingUp },
] as const;

export default function DashboardQuickActions() {
  const { t } = useI18n();

  return (
    <div className="dash-quick-actions" role="navigation" aria-label={t("dashboard.quickActions")}>
      {actions.map((action) => (
        <Link key={action.href} href={action.href} className="dash-quick-action">
          <span className="dash-quick-action-icon" aria-hidden>
            <action.icon size={20} strokeWidth={1.75} />
          </span>
          <span className="dash-quick-action-label">{t(action.labelKey)}</span>
        </Link>
      ))}
    </div>
  );
}
