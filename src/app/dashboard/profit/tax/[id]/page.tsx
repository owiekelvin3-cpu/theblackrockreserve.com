"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import ProfitTaxPayPanel, { type ProfitTaxPageData } from "@/components/dashboard/ProfitTaxPayPanel";
import Button from "@/components/ui/Button";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ProfitTaxPayPage() {
  const params = useParams();
  const requestId = typeof params.id === "string" ? params.id : "";
  const { t } = useI18n();
  const [data, setData] = useState<ProfitTaxPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    (silent = false) => {
      if (!requestId) return;
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      fetchDashboardJson<ProfitTaxPageData>(`/api/dashboard/profit/tax/${requestId}`)
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
    [requestId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardGate isLoading={loading}>
      {error || !data ? (
        <div className="max-w-lg mx-auto dash-card flex items-start gap-3 border border-accent-red/30 bg-accent-red/5 p-4 rounded-xl">
          <AlertCircle className="text-accent-red shrink-0 mt-0.5" size={20} />
          <div className="space-y-3">
            <p className="text-sm text-text-primary">{t("investments.profitTax.loadError")}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => load()}>
              {t("common.retry")}
            </Button>
          </div>
        </div>
      ) : (
        <ProfitTaxPayPanel data={data} onRefresh={() => load(true)} />
      )}
    </DashboardGate>
  );
}
