"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/fetch-json";
import DashboardGate from "@/components/dashboard/DashboardGate";
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
  availableProfitBalance?: number;
  pendingProfitWithdrawal?: {
    id: string;
    amountUsd: number;
    taxPaymentUrl: string;
  } | null;
  bitcoinWalletAddress: string;
  depositsEnabled: boolean;
  savings: SavingsData;
  cashFlowData: CashFlowMonth[];
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <DashboardGate isLoading={loading}>
      {data && (
        <div className="dash-overview">
          <DashboardMobileHero
            totalBalance={data.totalBalance}
            investedBalance={data.investedBalance}
            profitBalance={data.profitBalance}
            savingsBalance={data.savings.savingsBalance}
            savingsApy={data.savings.apyAnnualPercent}
            onProfitWithdraw={loadData}
          />

          <DashboardQuickActions />

          {!hasActivity && (
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
          )}

          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <SavingsPanel data={data.savings} onUpdated={loadData} />
            </div>
            <div className="lg:col-span-3 w-full min-w-0">
              <CashFlowPanel data={data.cashFlowData ?? []} />
            </div>
          </div>

          <div className="lg:hidden">
            <RecentActivityPanel variant="mobile" showViewAllLink />
          </div>
          <div className="hidden lg:block">
            <RecentActivityPanel showViewAllLink />
          </div>
        </div>
      )}
    </DashboardGate>
  );
}
