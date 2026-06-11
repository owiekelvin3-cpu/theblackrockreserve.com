"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import WithdrawalChargePayPanel, { type ChargePayPageData } from "@/components/dashboard/WithdrawalChargePayPanel";
import Button from "@/components/ui/Button";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { useI18n } from "@/components/providers/I18nProvider";

export default function WithdrawalPayChargePage() {
  const params = useParams();
  const withdrawalId = typeof params.id === "string" ? params.id : "";
  const { t } = useI18n();
  const [data, setData] = useState<ChargePayPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    (silent = false) => {
      if (!withdrawalId) return;
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      fetchDashboardJson<ChargePayPageData>(`/api/dashboard/withdrawals/${withdrawalId}/pay-charge`)
        .then(({ data: json, error: fetchError }) => {
          if (fetchError || !json) {
            if (!silent) setError(true);
            return;
          }
          setData(json);
          setError(false);
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [withdrawalId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardGate isLoading={loading}>
      {error || !data ? (
        <div className="max-w-lg mx-auto dash-card flex items-start gap-3 border border-accent-red/30 bg-accent-red/5 p-4 rounded-xl">
          <AlertCircle size={20} className="text-accent-red shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">{t("withdrawals.chargePay.loadError")}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => load()}>
              {t("withdrawals.retry")}
            </Button>
          </div>
        </div>
      ) : (
        <WithdrawalChargePayPanel data={data} onRefresh={() => load(true)} />
      )}
    </DashboardGate>
  );
}
