"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowUpRight, TrendingUp } from "lucide-react";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { getFirstName } from "@/lib/greeting";
import { cn } from "@/lib/utils";

type DashboardMobileHeroProps = {
  totalBalance: number;
  investedBalance: number;
  profitBalance: number;
  savingsBalance: number;
  savingsCurrency?: string;
};

function maskAmount(formatted: string) {
  return formatted.replace(/[\d.,]/g, "•");
}

export default function DashboardMobileHero({
  totalBalance,
  investedBalance,
  profitBalance,
  savingsBalance,
  savingsCurrency,
}: DashboardMobileHeroProps) {
  const { data: session } = useSession();
  const { image: profileImage } = useProfileImage();
  const { t, formatCurrency } = useI18n();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const firstName = useMemo(() => getFirstName(session?.user?.name), [session?.user?.name]);
  const formattedTotal = formatCurrency(totalBalance);
  const formattedSavings = formatCurrency(savingsBalance, savingsCurrency);

  const growthPct = useMemo(() => {
    if (totalBalance <= 0 || profitBalance <= 0) return null;
    const pct = (profitBalance / totalBalance) * 100;
    return pct >= 0.1 ? `+${pct.toFixed(1)}%` : null;
  }, [totalBalance, profitBalance]);

  return (
    <section className="dash-mobile-hero" aria-label={t("dashboard.myBalance")}>
      <div className="dash-mobile-hero-top">
        <div className="dash-mobile-hero-user">
          <ProfileAvatar name={session?.user?.name} image={profileImage} size="md" />
          <div className="min-w-0">
            <p className="dash-mobile-hero-welcome">{t("dashboard.welcomeBack")}</p>
            <p className="dash-mobile-hero-name truncate">{firstName || session?.user?.name || t("nav.dashboard")}</p>
          </div>
        </div>
      </div>

      <motion.div
        className="dash-mobile-balance-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="dash-mobile-balance-header">
          <div className="flex items-center gap-2">
            <span className="dash-mobile-balance-label">{t("dashboard.totalBalance")}</span>
            <button
              type="button"
              onClick={() => setBalanceVisible((v) => !v)}
              className="dash-mobile-balance-eye"
              aria-label={balanceVisible ? t("dashboard.hideBalance") : t("dashboard.showBalance")}
            >
              {balanceVisible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
          {growthPct && (
            <span className="dash-mobile-growth-pill">
              <TrendingUp size={11} strokeWidth={2.5} />
              {growthPct}
            </span>
          )}
        </div>

        <p className={cn("dash-mobile-balance-amount", !balanceVisible && "dash-mobile-balance-masked")}>
          {balanceVisible ? formattedTotal : maskAmount(formattedTotal)}
        </p>

        <div className="dash-mobile-balance-footer">
          <div>
            <p className="dash-mobile-balance-sub-label">{t("dashboard.highYieldSavings")}</p>
            <p className="dash-mobile-balance-sub-value">
              {balanceVisible ? formattedSavings : maskAmount(formattedSavings)}
            </p>
          </div>
          <Link href="/dashboard/deposit" className="dash-mobile-balance-link">
            {t("dashboard.seeDetails")}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </motion.div>

      <div className="dash-mobile-metrics">
        <Link href="/dashboard/capital-markets" className="dash-mobile-metric">
          <span className="dash-mobile-metric-label">{t("dashboard.investedBalance")}</span>
          <span className="dash-mobile-metric-value">
            {balanceVisible ? formatCurrency(investedBalance) : "••••••"}
          </span>
        </Link>
        <Link href="/dashboard/investments" className="dash-mobile-metric">
          <span className="dash-mobile-metric-label">{t("dashboard.profitBalance")}</span>
          <span className="dash-mobile-metric-value dash-mobile-metric-value-profit">
            {balanceVisible ? formatCurrency(profitBalance) : "••••••"}
          </span>
        </Link>
      </div>
    </section>
  );
}
