"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import { WithdrawalChargeVerifyingView } from "@/components/dashboard/WithdrawalScriptAnimations";
import { fetchDashboardJson } from "@/lib/fetch-json";
import type { ChargePayPageData } from "@/components/dashboard/WithdrawalChargePayPanel";
import { useI18n } from "@/components/providers/I18nProvider";

export default function WithdrawalChargeVerifyingPanel({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter();
  const { formatCurrency } = useI18n();
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(0);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      fetchDashboardJson<ChargePayPageData>(`/api/dashboard/withdrawals/${withdrawalId}/pay-charge`)
        .then(({ data, error }) => {
          if (error || !data?.chargePayment) return;

          const status = data.chargePayment.status;
          const step = data.script?.step ?? 0;
          const phase = data.script?.phase;
          setAmount(data.chargePayment.amountUsd);

          if (status === "REJECTED" || status === "UNPAID") {
            router.replace(`/dashboard/withdrawals/${withdrawalId}/pay-charge/payment`);
            return;
          }

          if (status === "PAID" && phase === "PENDING_TIMER") {
            if (step === 1) {
              router.replace(`/dashboard/withdrawals/${withdrawalId}/pay-charge`);
            } else if (step === 0 || step === 3) {
              router.replace(`/dashboard/withdrawals/${withdrawalId}/script/pending`);
            } else {
              router.replace(`/dashboard/withdrawals/${withdrawalId}/pay-charge`);
            }
            return;
          }

          if (status === "PAID" && !data.script) {
            router.replace(`/dashboard/withdrawals/${withdrawalId}/pay-charge`);
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
    const tick = window.setInterval(() => load(true), 8000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  return (
    <DashboardGate isLoading={loading}>
      <div className="max-w-xl mx-auto">
        {loading && amount <= 0 ? (
          <div className="dash-card flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent-gold" />
            <p className="text-xs text-text-muted">Loading…</p>
          </div>
        ) : (
          <WithdrawalChargeVerifyingView amount={amount} formatCurrency={formatCurrency} />
        )}
      </div>
    </DashboardGate>
  );
}
