"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ImfClearanceVerifyingView } from "@/components/dashboard/WithdrawalScriptAnimations";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { useI18n } from "@/components/providers/I18nProvider";

type ScriptPollData = {
  withdrawal: { scriptPhase: string };
  imfClearance: { amountUsd: number; status: string } | null;
};

export default function ImfClearanceVerifyingPanel({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter();
  const { formatCurrency } = useI18n();
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(0);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      fetchDashboardJson<ScriptPollData>(`/api/dashboard/withdrawals/${withdrawalId}/script`)
        .then(({ data, error }) => {
          if (error || !data?.imfClearance) return;

          setAmount(data.imfClearance.amountUsd);
          const status = data.imfClearance.status;
          const phase = data.withdrawal.scriptPhase;

          if (status === "REJECTED" || status === "UNPAID") {
            router.replace(`/dashboard/withdrawals/${withdrawalId}/imf-clearance/pay`);
            return;
          }

          if (status === "PAID" && phase === "PENDING_TIMER") {
            router.replace(`/dashboard/withdrawals/${withdrawalId}/script/pending`);
          }
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [withdrawalId, router]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tick = window.setInterval(() => load(true), 4000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  if (loading && amount <= 0) {
    return (
      <div className="dash-card flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent-gold" />
        <p className="text-xs text-text-muted">Loading…</p>
      </div>
    );
  }

  return <ImfClearanceVerifyingView amount={amount} formatCurrency={formatCurrency} />;
}
