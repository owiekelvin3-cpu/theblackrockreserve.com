"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DashboardGate from "@/components/dashboard/DashboardGate";
import { formatCurrency } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import { useI18n } from "@/components/providers/I18nProvider";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  value: number;
}

export default function InvestmentsPage() {
  const { t, formatCurrency: fmt } = useI18n();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [investedBalance, setInvestedBalance] = useState(0);
  const [profitBalance, setProfitBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ holdings: Holding[]; investedBalance: number; profitBalance: number }>(
      "/api/dashboard/investments"
    )
      .then((json) => {
        setHoldings(json?.holdings ?? []);
        setInvestedBalance(json?.investedBalance ?? 0);
        setProfitBalance(json?.profitBalance ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardGate
      isLoading={loading}
      isEmpty={holdings.length === 0}
      emptyTitle={t("investments.emptyTitle")}
      emptyDescription={t("investments.emptyDescription")}
      emptyActionLabel={t("investments.emptyAction")}
      emptyActionHref="/investments"
    >
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <p className="text-sm text-text-secondary">{t("investments.investedBalance")}</p>
            <p className="text-2xl font-bold text-white mt-1">{fmt(investedBalance)}</p>
            <p className="text-xs text-text-muted mt-1">{t("investments.investedBalanceDesc")}</p>
          </Card>
          <Card>
            <p className="text-sm text-text-secondary">{t("investments.profitBalance")}</p>
            <p className="text-2xl font-bold text-accent-green mt-1">{fmt(profitBalance)}</p>
            <p className="text-xs text-text-muted mt-1">{t("investments.profitBalanceDesc")}</p>
          </Card>
          <Card>
            <p className="text-sm text-text-secondary">{t("investments.activeHoldings")}</p>
            <p className="text-2xl font-bold text-white mt-1">{holdings.length}</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-white">{t("investments.holdings")}</h2>
            <Link href="/dashboard/capital-markets">
              <Button variant="outline" size="sm">{t("investments.trade")}</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-white/10">
                  <th className="pb-3 pr-4">{t("investments.asset")}</th>
                  <th className="pb-3 pr-4">{t("investments.shares")}</th>
                  <th className="pb-3 pr-4">{t("investments.avgPrice")}</th>
                  <th className="pb-3">{t("investments.value")}</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id} className="border-b border-white/5">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="gold">{h.symbol}</Badge>
                        <span className="text-white">{h.name}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-text-secondary">{h.shares.toFixed(4)}</td>
                    <td className="py-4 pr-4 text-text-secondary">{formatCurrency(h.avgPrice)}</td>
                    <td className="py-4 font-medium text-white">{formatCurrency(h.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    </DashboardGate>
  );
}
