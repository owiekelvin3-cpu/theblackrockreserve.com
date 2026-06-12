"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, AlertCircle, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DashboardGate from "@/components/dashboard/DashboardGate";
import EmptyState from "@/components/dashboard/EmptyState";
import WithdrawalMethodIcon from "@/components/dashboard/WithdrawalMethodIcon";
import WithdrawalReceiptModal, { type WithdrawalReceiptData } from "@/components/dashboard/WithdrawalReceiptModal";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import MemberTransferPanel from "@/components/dashboard/MemberTransferPanel";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import {
  WITHDRAWAL_CATEGORIES,
  WITHDRAWAL_METHODS,
  getWithdrawalMethod,
  type WithdrawalMethodId,
} from "@/lib/withdrawal-methods";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/I18nProvider";

interface ChargePayment {
  id: string;
  status: string;
  statusLabel: string;
  amountUsd: number;
}

interface WithdrawalData {
  accounts: { id: string; name: string; currency: string; balance: number; availableBalance: number }[];
  userCharge: {
    chargeType: "FIXED" | "PERCENTAGE";
    amountUsd: number;
    percentage: number | null;
    summary: string;
  } | null;
  chargePaymentMethods: {
    bitcoinWalletAddress: string;
    bitcoinPurchaseLink: string;
    depositInstructions: string;
    qrCodeDataUrl?: string;
  };
  withdrawals: {
    id: string;
    accountId: string;
    method: WithdrawalMethodId;
    methodLabel: string;
    amountUsd: number;
    assignedChargeAmount: number | null;
    destination: string;
    destinationExtra: string | null;
    note: string | null;
    status: string;
    statusLabel: string;
    reviewNote: string | null;
    createdAt: string;
    chargePayment: ChargePayment | null;
  }[];
  confirmationMessage: string;
}

const WITHDRAWAL_HISTORY_PREVIEW = 2;

const emptyData: WithdrawalData = {
  accounts: [],
  userCharge: null,
  chargePaymentMethods: { bitcoinWalletAddress: "", bitcoinPurchaseLink: "", depositInstructions: "" },
  withdrawals: [],
  confirmationMessage: "",
};

export default function WithdrawalsPage() {
  const router = useRouter();
  const { t, formatCurrency } = useI18n();
  const [data, setData] = useState<WithdrawalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [method, setMethod] = useState<WithdrawalMethodId>("ACH");
  const [amountUsd, setAmountUsd] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationExtra, setDestinationExtra] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<WithdrawalReceiptData | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const selectedMethodDef = getWithdrawalMethod(method)!;

  const load = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    fetchDashboardJson<WithdrawalData>("/api/dashboard/withdrawals")
      .then(({ data: json, error }) => {
        if (error || !json) {
          if (!silent) {
            setLoadError(true);
            setData(emptyData);
          }
          return;
        }
        setLoadError(false);
        setData(json);
        if (json.accounts?.length) {
          setAccountId((prev) => prev || json.accounts[0].id);
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") load(true);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, []);

  const withdrawalData = data ?? emptyData;
  const selectedAccount = withdrawalData.accounts.find((a) => a.id === accountId);

  const handleMethodChange = (id: WithdrawalMethodId) => {
    setMethod(id);
    setDestination("");
    setDestinationExtra("");
  };

  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const buildPayload = (transactionPin: string, chargeAcknowledged = false) => ({
    accountId,
    method,
    amountUsd: Number(amountUsd),
    destination: destination.trim(),
    destinationExtra: destinationExtra.trim() || undefined,
    note: note.trim() || undefined,
    transactionPin,
    ...(chargeAcknowledged || withdrawalData.userCharge ? { chargeAcknowledged: true } : {}),
  });

  const validateWithdrawalForm = (): string | null => {
    const amount = Number(amountUsd);
    if (!accountId) return t("withdrawals.errors.noAccount");
    if (!Number.isFinite(amount) || amount <= 0) return t("withdrawals.errors.invalidAmount");
    if (!destination.trim()) return t("withdrawals.errors.destinationRequired");
    if (extraRequired && !destinationExtra.trim()) {
      return selectedMethodDef.extraLabel
        ? `${selectedMethodDef.extraLabel} is required`
        : t("withdrawals.errors.extraRequired");
    }
    const available = selectedAccount?.availableBalance ?? 0;
    if (amount > available) {
      return t("withdrawals.errors.insufficientBalance", { amount: formatCurrency(available) });
    }
    return null;
  };

  const submitWithdrawal = async (transactionPin: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload(transactionPin)),
      });
      const json = await res.json();

      if (json.requiresChargeAcknowledgment) {
        throw new Error(
          json.message ||
            t("withdrawals.errors.chargeAcknowledgment", {
              amount: json.chargeAmount != null ? formatCurrency(json.chargeAmount) : "",
            })
        );
      }

      if (!res.ok) throw new Error(json.error || t("withdrawals.errors.submitFailed"));

      setAmountUsd("");
      setDestination("");
      setDestinationExtra("");
      setNote("");

      if (json.requiresChargePayment && json.withdrawal?.id) {
        router.push(`/dashboard/withdrawals/${json.withdrawal.id}/pay-charge`);
        return;
      }

      toast.success(json.message || withdrawalData.confirmationMessage);
      if (json.receipt) {
        setReceiptData(json.receipt as WithdrawalReceiptData);
        setReceiptOpen(true);
      }
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateWithdrawalForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    requestPin(async (transactionPin) => {
      await submitWithdrawal(transactionPin);
    });
  };

  const extraRequired = ["ACH", "WIRE", "DEBIT_CARD", "PAPER_CHECK"].includes(method);

  const statusClass = (status: string) => {
    if (status === "APPROVED") return "bg-accent-green/15 text-accent-green";
    if (status === "REJECTED") return "bg-accent-red/15 text-accent-red";
    if (status === "AWAITING_CHARGE_PAYMENT") return "bg-amber-500/15 text-amber-400";
    return "bg-accent-brand/15 text-accent-brand";
  };

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {t("withdrawals.title")} <span className="gold-gradient-text">{t("withdrawals.titleHighlight")}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">{t("withdrawals.subtitle")}</p>
        </div>

        {loadError && (
          <div className="dash-card flex items-start gap-3 border border-accent-red/30 bg-accent-red/5 p-4 rounded-xl">
            <AlertCircle size={20} className="text-accent-red shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{t("withdrawals.loadError")}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => load()}>
                {t("withdrawals.retry")}
              </Button>
            </div>
          </div>
        )}

        {withdrawalData.accounts.length === 0 ? (
          <Card>
            <EmptyState
              title={t("withdrawals.noAccount")}
              description={t("withdrawals.noAccountDesc")}
            />
          </Card>
        ) : (
          <>
            {WITHDRAWAL_CATEGORIES.map((category) => {
              const methods = WITHDRAWAL_METHODS.filter((m) => m.category === category);
              return (
                <Card key={category}>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-4">{category}</p>
                  {category === "Bank Transfers" && (
                    <MemberTransferPanel
                      accounts={withdrawalData.accounts}
                      onSuccess={() => load(true)}
                      className="mb-5"
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {methods.map((m) => {
                      const selected = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleMethodChange(m.id)}
                          className={cn(
                            "relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all min-h-[44px]",
                            selected
                              ? "border-accent-brand/60 bg-accent-brand/10 shadow-brand/20 shadow-lg"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                          )}
                        >
                          {selected && (
                            <span className="absolute top-2.5 right-2.5 text-accent-brand">
                              <Check size={14} />
                            </span>
                          )}
                          <div className="h-10 w-10 rounded-xl bg-bg-primary border border-white/10 flex items-center justify-center shrink-0">
                            <WithdrawalMethodIcon method={m} size="md" />
                          </div>
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-semibold text-white">{m.label}</p>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{m.timing}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}

            <Card>
              <div className="flex items-center gap-2 mb-6">
                <ArrowUpFromLine size={20} className="text-accent-brand" />
                <div>
                  <h2 className="font-semibold text-white">Request Withdrawal</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    via {selectedMethodDef.label} · {selectedMethodDef.timing}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Withdraw from account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-text-primary text-sm min-h-[44px]"
                  >
                    {withdrawalData.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency}) — {formatCurrency(a.availableBalance)} available
                      </option>
                    ))}
                  </select>
                </div>

                <Input label="Amount (USD)" type="number" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} placeholder="0.00" min="0.01" step="0.01" required />
                <Input label={selectedMethodDef.destinationLabel} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={selectedMethodDef.destinationPlaceholder} required />
                {selectedMethodDef.extraLabel && (
                  <Input label={selectedMethodDef.extraLabel} value={destinationExtra} onChange={(e) => setDestinationExtra(e.target.value)} placeholder={selectedMethodDef.extraPlaceholder} required={extraRequired} />
                )}
                <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional details..." />

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={submitting || !accountId || !amountUsd || !destination || (extraRequired && !destinationExtra) || (selectedAccount?.availableBalance ?? 0) <= 0}
                >
                  {submitting ? t("withdrawals.submitting") : t("withdrawals.confirmWithdrawal")}
                </Button>
              </form>
            </Card>
          </>
        )}

        {withdrawalData.withdrawals.length > 0 && (
          <Card>
            <h2 className="font-semibold text-white mb-4">{t("withdrawals.history")}</h2>
            <div className="space-y-3">
              {(historyExpanded
                ? withdrawalData.withdrawals
                : withdrawalData.withdrawals.slice(0, WITHDRAWAL_HISTORY_PREVIEW)
              ).map((w) => {
                const methodDef = getWithdrawalMethod(w.method);
                const canPayCharge =
                  w.status === "AWAITING_CHARGE_PAYMENT" &&
                  w.chargePayment &&
                  (w.chargePayment.status === "UNPAID" || w.chargePayment.status === "REJECTED");
                return (
                  <div key={w.id} className="dash-wallet-tile p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {methodDef && (
                          <div className="h-9 w-9 rounded-lg bg-bg-primary border border-white/10 flex items-center justify-center shrink-0">
                            <WithdrawalMethodIcon method={methodDef} size="sm" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium">
                            {formatCurrency(w.amountUsd)} · {w.methodLabel}
                          </p>
                          <p className="text-xs text-text-muted truncate">{w.destination}</p>
                          <p className="text-xs text-text-muted">{new Date(w.createdAt).toLocaleString()}</p>
                          {w.assignedChargeAmount != null && w.assignedChargeAmount > 0 && (
                            <p className="text-xs text-amber-400 mt-1">
                              Charge: {formatCurrency(w.assignedChargeAmount)}
                              {w.chargePayment && ` · ${w.chargePayment.statusLabel}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusClass(w.status))}>
                          {w.statusLabel}
                        </span>
                        {canPayCharge && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/dashboard/withdrawals/${w.id}/pay-charge`)}
                          >
                            {t("withdrawals.payCharge")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {withdrawalData.withdrawals.length > WITHDRAWAL_HISTORY_PREVIEW && (
              <button
                type="button"
                onClick={() => setHistoryExpanded((expanded) => !expanded)}
                className="mt-4 w-full text-sm font-medium text-accent-brand hover:text-accent-brand/80 transition-colors py-2"
              >
                {historyExpanded
                  ? t("withdrawals.historyShowLess")
                  : t("withdrawals.historyViewMore", {
                      count: withdrawalData.withdrawals.length - WITHDRAWAL_HISTORY_PREVIEW,
                    })}
              </button>
            )}
          </Card>
        )}
      </div>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />

      <WithdrawalReceiptModal
        open={receiptOpen}
        receipt={receiptData}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptData(null);
        }}
      />
    </DashboardGate>
  );
}
