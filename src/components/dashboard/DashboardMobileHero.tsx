"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import SavingsApyBadge from "@/components/dashboard/SavingsApyBadge";
import ProfitWithdrawButton from "@/components/dashboard/ProfitWithdrawButton";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { getFirstName } from "@/lib/greeting";
import { useLiveClock } from "@/hooks/use-live-clock";
import { cn } from "@/lib/utils";

type DashboardMobileHeroProps = {
  totalBalance: number;
  investedBalance: number;
  profitBalance: number;
  savingsBalance: number;
  savingsCurrency?: string;
  savingsApy?: number;
  onProfitWithdraw?: () => void;
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
  savingsApy = 20,
  onProfitWithdraw,
}: DashboardMobileHeroProps) {
  const { data: session } = useSession();
  const { image: profileImage } = useProfileImage();
  const { t, formatCurrency, locale } = useI18n();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const firstName = useMemo(() => getFirstName(session?.user?.name), [session?.user?.name]);
  const { clock, ready } = useLiveClock(firstName, locale, t);
  const formattedTotal = formatCurrency(totalBalance);
  const formattedSavings = formatCurrency(savingsBalance, savingsCurrency);

  return (
    <section className="dash-mobile-hero" aria-label={t("dashboard.myBalance")}>
      <div className="dash-mobile-hero-top">
        <div className="dash-mobile-hero-user">
          <ProfileAvatar name={session?.user?.name} image={profileImage} size="md" />
          <div className="min-w-0">
            <p className="dash-mobile-hero-greeting truncate" aria-live="polite">
              {ready && clock ? clock.greeting : t("dashboard.greetingMorning")}
            </p>
            {ready && clock && (
              <p className="dash-mobile-hero-date truncate">{clock.dateLine}</p>
            )}
          </div>
        </div>
        {ready && clock && (
          <time
            className="dash-mobile-hero-time"
            dateTime={new Date().toISOString()}
            aria-live="polite"
          >
            {clock.timeLine}
          </time>
        )}
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
        </div>

        <p className={cn("dash-mobile-balance-amount", !balanceVisible && "dash-mobile-balance-masked")}>
          {balanceVisible ? formattedTotal : maskAmount(formattedTotal)}
        </p>

        <div className="dash-mobile-balance-footer">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="dash-mobile-balance-sub-label">{t("dashboard.highYieldSavings")}</p>
              <SavingsApyBadge rate={savingsApy} size="sm" />
            </div>
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
        <div className="dash-mobile-metric dash-mobile-metric-profit">
          <Link href="/dashboard/investments" className="dash-mobile-metric-profit-link">
            <span className="dash-mobile-metric-label">{t("dashboard.profitBalance")}</span>
            <span className="dash-mobile-metric-value dash-mobile-metric-value-profit">
              {balanceVisible ? formatCurrency(profitBalance) : "••••••"}
            </span>
          </Link>
          {onProfitWithdraw && (
            <ProfitWithdrawButton
              profitBalance={profitBalance}
              onSuccess={onProfitWithdraw}
            />
          )}
        </div>
      </div>
    </section>
  );
}
