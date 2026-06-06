"use client";

import { useEffect, useState } from "react";
import { ArrowUpFromLine, AlertCircle, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DashboardGate from "@/components/dashboard/DashboardGate";
import EmptyState from "@/components/dashboard/EmptyState";
import WithdrawalMethodIcon from "@/components/dashboard/WithdrawalMethodIcon";
import {
  WITHDRAWAL_CATEGORIES,
  WITHDRAWAL_METHODS,
  getWithdrawalMethod,
  type WithdrawalMethodId,
} from "@/lib/withdrawal-methods";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

interface WithdrawalData {
  accounts: { id: string; name: string; currency: string; balance: number; availableBalance: number }[];
  withdrawals: {
    id: string;
    accountId: string;
    method: WithdrawalMethodId;
    methodLabel: string;
    amountUsd: number;
    destination: string;
    destinationExtra: string | null;
    note: string | null;
    status: string;
    reviewNote: string | null;
    createdAt: string;
  }[];
  confirmationMessage: string;
}

const emptyData: WithdrawalData = {
  accounts: [],
  withdrawals: [],
  confirmationMessage:
    "Your withdrawal request has been submitted. Our team will review and process it according to your selected payout method.",
};

export default function WithdrawalsPage() {
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

  const selectedMethodDef = getWithdrawalMethod(method)!;

  const load = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    fetchDashboardJson<WithdrawalData>("/api/dashboard/withdrawals")
      .then(({ data, error }) => {
        if (error || !data) {
          if (!silent) {
            setLoadError(true);
            setData(emptyData);
          }
          return;
        }
        setLoadError(false);
        setData(data);
        if (data.accounts?.length) {
          setAccountId((prev) => prev || data.accounts[0].id);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId,
          method,
          amountUsd: Number(amountUsd),
          destination,
          destinationExtra: destinationExtra || undefined,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      toast.success(json.message || withdrawalData.confirmationMessage);
      setAmountUsd("");
      setDestination("");
      setDestinationExtra("");
      setNote("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const extraRequired = ["ACH", "WIRE", "DEBIT_CARD", "PAPER_CHECK"].includes(method);

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Withdraw <span className="gold-gradient-text">Funds</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Choose from 11 payout methods — bank transfers, digital wallets, debit card, stablecoins, or paper check.
            Requests are reviewed before funds are sent.
          </p>
        </div>

        {loadError && (
          <div className="dash-card flex items-start gap-3 border border-accent-red/30 bg-accent-red/5">
            <AlertCircle size={20} className="text-accent-red shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Could not load withdrawal info</p>
              <p className="text-xs text-text-secondary mt-1">Please try again. If the problem continues, contact support.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => load()}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {withdrawalData.accounts.length === 0 ? (
          <Card>
            <EmptyState
              title="No account found"
              description="Your checking account should be created at registration. Contact support if this is missing."
            />
          </Card>
        ) : (
          <>
            {WITHDRAWAL_CATEGORIES.map((category) => {
              const methods = WITHDRAWAL_METHODS.filter((m) => m.category === category);
              return (
                <Card key={category}>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-4">{category}</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {methods.map((m) => {
                      const selected = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleMethodChange(m.id)}
                          className={cn(
                            "relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
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
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-text-primary text-sm"
                  >
                    {withdrawalData.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency}) — {formatCurrency(a.availableBalance)} available
                      </option>
                    ))}
                  </select>
                  {selectedAccount && (
                    <p className="text-xs text-text-muted mt-2">
                      Balance: {formatCurrency(selectedAccount.balance)} · Available:{" "}
                      <span className="text-emerald-400">{formatCurrency(selectedAccount.availableBalance)}</span>
                      {selectedAccount.balance !== selectedAccount.availableBalance && (
                        <span> (pending requests reserved)</span>
                      )}
                    </p>
                  )}
                </div>

                <Input
                  label="Amount (USD)"
                  type="number"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />

                <Input
                  label={selectedMethodDef.destinationLabel}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={selectedMethodDef.destinationPlaceholder}
                  required
                />

                {selectedMethodDef.extraLabel && (
                  <Input
                    label={selectedMethodDef.extraLabel}
                    value={destinationExtra}
                    onChange={(e) => setDestinationExtra(e.target.value)}
                    placeholder={selectedMethodDef.extraPlaceholder}
                    required={extraRequired}
                  />
                )}

                {selectedMethodDef.hint && (
                  <p className="text-xs text-text-muted -mt-2">{selectedMethodDef.hint}</p>
                )}

                <Input
                  label="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any additional details..."
                />

                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !accountId ||
                    !amountUsd ||
                    !destination ||
                    (extraRequired && !destinationExtra) ||
                    (selectedAccount?.availableBalance ?? 0) <= 0
                  }
                >
                  {submitting ? "Submitting..." : `Submit ${selectedMethodDef.label} Withdrawal`}
                </Button>
              </form>
            </Card>
          </>
        )}

        {withdrawalData.withdrawals.length > 0 && (
          <Card>
            <h2 className="font-semibold text-white mb-4">Withdrawal History</h2>
            <div className="space-y-3">
              {withdrawalData.withdrawals.map((w) => {
                const methodDef = getWithdrawalMethod(w.method);
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {methodDef && (
                        <div className="h-9 w-9 rounded-lg bg-bg-primary border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <WithdrawalMethodIcon method={methodDef} size="sm" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium">
                          {formatCurrency(w.amountUsd)} · {w.methodLabel}
                        </p>
                        <p className="text-xs text-text-muted truncate">{w.destination}</p>
                        {w.destinationExtra && (
                          <p className="text-xs text-text-muted truncate">{w.destinationExtra}</p>
                        )}
                        <p className="text-xs text-text-muted">{new Date(w.createdAt).toLocaleString()}</p>
                        {w.reviewNote && w.status === "REJECTED" && (
                          <p className="text-xs text-accent-red mt-1">Reason: {w.reviewNote}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                        w.status === "APPROVED"
                          ? "bg-accent-green/15 text-accent-green"
                          : w.status === "REJECTED"
                            ? "bg-accent-red/15 text-accent-red"
                            : "bg-accent-brand/15 text-accent-brand"
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </DashboardGate>
  );
}
