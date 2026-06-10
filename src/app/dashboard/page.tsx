"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, ArrowUpRight, ChevronDown, RotateCcw } from "lucide-react";
import { fetchJson } from "@/lib/fetch-json";
import DashboardGate from "@/components/dashboard/DashboardGate";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import DashboardMobileHero from "@/components/dashboard/DashboardMobileHero";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import SavingsPanel, { type SavingsData } from "@/components/dashboard/SavingsPanel";
import CashFlowPanel, { type CashFlowMonth } from "@/components/dashboard/CashFlowPanel";
import RecentActivityPanel from "@/components/dashboard/RecentActivityPanel";
import { useI18n } from "@/components/providers/I18nProvider";

interface OverviewData {
  totalBalance: number;
  investedBalance: number;
  profitBalance: number;
  bitcoinWalletAddress: string;
  depositsEnabled: boolean;
  savings: SavingsData;
  cashFlowData: CashFlowMonth[];
}

export default function DashboardPage() {
  const { t, formatCurrency } = useI18n();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this-month");

  const loadData = () => {
    setLoading(true);
    fetchJson<OverviewData>("/api/dashboard/overview")
      .then((json) => {
        setData(json);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasActivity =
    data &&
    (data.totalBalance > 0 ||
      data.investedBalance > 0 ||
      data.profitBalance > 0 ||
      data.savings.savingsBalance > 0 ||
      data.savings.availableToSave > 0);

  const fundBanner = data && !hasActivity && (
    <div className="dash-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-accent-brand/20">
      <div>
        <p className="text-sm font-semibold text-text-primary">{t("dashboard.fundAccount")}</p>
        <p className="text-sm text-text-muted mt-1">
          {data.depositsEnabled ? t("dashboard.fundAccountDesc") : t("dashboard.fundAccountDescAlt")}
        </p>
      </div>
      <Link
        href="/dashboard/deposit"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient-bg shadow-brand min-h-[44px]"
      >
        {data.depositsEnabled ? t("dashboard.viewDeposit") : t("dashboard.goToDeposit")}
      </Link>
    </div>
  );

  return (
    <DashboardGate isLoading={loading}>
      {data && (
        <div className="dash-overview">
          {/* ── Mobile layout ── */}
          <div className="lg:hidden dash-mobile-overview">
            <DashboardMobileHero
              totalBalance={data.totalBalance}
              investedBalance={data.investedBalance}
              profitBalance={data.profitBalance}
              savingsBalance={data.savings.savingsBalance}
              savingsCurrency={data.savings.savings.currency}
            />
            <DashboardQuickActions />
            {fundBanner}
            <SavingsPanel data={data.savings} onUpdated={loadData} />
            <CashFlowPanel data={data.cashFlowData} />
            <RecentActivityPanel variant="mobile" />
          </div>

          {/* ── Desktop layout ── */}
          <div className="hidden lg:block space-y-6">
            <div className="flex flex-col gap-4">
              <DashboardGreeting />
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:-mt-2">
                <div className="relative">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="dash-control-btn appearance-none pr-8 cursor-pointer"
                    aria-label="Select period"
                  >
                    <option value="this-month">{t("dashboard.thisMonth")}</option>
                    <option value="last-month">{t("dashboard.lastMonth")}</option>
                    <option value="this-year">{t("dashboard.thisYear")}</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
                <button type="button" onClick={loadData} className="dash-control-btn">
                  <RotateCcw size={14} />
                  {t("dashboard.resetData")}
                </button>
              </div>
            </div>

            {fundBanner}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="dash-stat-primary p-5 min-h-[168px] flex flex-col justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/75">{t("dashboard.myBalance")}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                    {formatCurrency(data.totalBalance)}
                  </p>
                </div>
                <Link href="/dashboard/deposit" className="text-xs text-white/65 hover:text-white flex items-center gap-1 mt-3 transition-colors">
                  {t("dashboard.seeDetails")} <ArrowUpRight size={12} />
                </Link>
              </div>

              <div className="dash-stat-secondary p-5 min-h-[168px] flex flex-col justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Wallet size={18} className="text-text-muted" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t("dashboard.investedBalance")}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                    {formatCurrency(data.investedBalance)}
                  </p>
                </div>
                <Link href="/dashboard/capital-markets" className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mt-3 transition-colors">
                  {t("dashboard.viewPortfolio")} <ArrowUpRight size={12} />
                </Link>
              </div>

              <div className="dash-stat-secondary p-5 min-h-[168px] flex flex-col justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <TrendingUp size={18} className="text-text-muted" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t("dashboard.profitBalance")}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                    {formatCurrency(data.profitBalance)}
                  </p>
                </div>
                <Link href="/dashboard/investments" className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mt-3 transition-colors">
                  {t("dashboard.seeDetails")} <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <SavingsPanel data={data.savings} onUpdated={loadData} />
              </div>
              <div className="lg:col-span-3">
                <CashFlowPanel data={data.cashFlowData} />
              </div>
            </div>

            <RecentActivityPanel />
          </div>
        </div>
      )}
    </DashboardGate>
  );
}
