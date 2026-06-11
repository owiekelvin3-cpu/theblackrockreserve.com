"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Wallet, TrendingUp, History, Activity,
  ArrowDownLeft, ArrowUpRight, LineChart,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DashboardGate from "@/components/dashboard/DashboardGate";
import StockIcon from "@/components/capital-markets/StockIcon";
import { formatCurrency, cn } from "@/lib/utils";
import { fetchDashboardJson } from "@/lib/fetch-json";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

interface JointDetail {
  id: string;
  accountNumber: string;
  balance: number;
  portfolioValue: number;
  ownershipType: string;
  members: { id: string; name: string; email: string; role: string }[];
  holdings: {
    symbol: string;
    name: string;
    shares: number;
    marketValue: number;
    gainLoss: number;
    gainLossPercent: number;
  }[];
  transactions: { id: string; type: string; amount: number; description: string; createdAt: string }[];
  investmentHistory: { id: string; symbol: string; assetName: string; amountUsd: number; totalCost: number; createdAt: string }[];
  activity: { id: string; action: string; createdAt: string }[];
}

export default function JointAccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<JointDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [investSymbol, setInvestSymbol] = useState("AAPL");
  const [investAmount, setInvestAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"overview" | "holdings" | "history" | "activity">("overview");
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const load = useCallback(() => {
    setLoading(true);
    fetchDashboardJson<JointDetail>(`/api/dashboard/joint-accounts/${id}`)
      .then(({ data: json }) => setData(json))
      .catch(() => toast.error("Failed to load joint account"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const postAction = (path: string, body: Record<string, unknown>, successMsg: string) => {
    requestPin(async (transactionPin) => {
      setSubmitting(true);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...body, transactionPin }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        if (json.pendingApproval) {
          toast.success("Submitted for co-owner approval");
        } else {
          toast.success(successMsg);
        }
        setAmount("");
        setInvestAmount("");
        load();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed");
      } finally {
        setSubmitting(false);
      }
    });
  };

  const totalValue = (data?.balance ?? 0) + (data?.portfolioValue ?? 0);

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6">
        <Link href="/dashboard/joint-accounts" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-accent-brand transition-colors">
          <ArrowLeft size={16} /> Back to Joint Accounts
        </Link>

        {data && (
          <>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand mb-1">Joint Account</p>
                <h1 className="text-2xl font-bold font-mono text-[var(--text-primary)]">{data.accountNumber}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {data.members.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                      <Users size={12} />
                      {m.name}
                      {m.role === "PRIMARY" && <span className="text-accent-brand">· Primary</span>}
                    </span>
                  ))}
                </div>
              </div>
              <Badge variant="gold">{data.ownershipType.replace("_", " ")}</Badge>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <Wallet size={16} /> Cash Balance
                </div>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(data.balance)}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <LineChart size={16} /> Portfolio Value
                </div>
                <p className="font-mono text-2xl font-bold text-accent-brand">{formatCurrency(data.portfolioValue)}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <TrendingUp size={16} /> Total Value
                </div>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalValue)}</p>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <ArrowDownLeft size={16} className="text-accent-green" /> Deposit
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">Transfer from your personal checking account</p>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (USD)"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] font-mono text-sm mb-3"
                />
                <Button size="sm" className="w-full" disabled={submitting || !amount} onClick={() => postAction(`/api/dashboard/joint-accounts/${id}/deposit`, { amount: Number(amount) }, "Deposit completed")}>
                  Deposit Funds
                </Button>
              </Card>
              <Card>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <ArrowUpRight size={16} className="text-accent-red" /> Withdraw
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">Large withdrawals require co-owner approval</p>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (USD)"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] font-mono text-sm mb-3"
                />
                <Button size="sm" variant="outline" className="w-full" disabled={submitting || !amount} onClick={() => postAction(`/api/dashboard/joint-accounts/${id}/withdraw`, { amount: Number(amount) }, "Withdrawal processed")}>
                  Withdraw Funds
                </Button>
              </Card>
              <Card>
                <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <LineChart size={16} className="text-accent-brand" /> Invest
                </h3>
                <div className="flex gap-2 mb-3">
                  <input
                    value={investSymbol}
                    onChange={(e) => setInvestSymbol(e.target.value.toUpperCase())}
                    placeholder="Symbol"
                    className="w-24 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] font-mono text-sm uppercase"
                  />
                  <input
                    type="number"
                    min="1"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] font-mono text-sm"
                  />
                </div>
                <Button size="sm" className="w-full" disabled={submitting || !investAmount} onClick={() => postAction(`/api/dashboard/joint-accounts/${id}/invest`, { symbol: investSymbol, amountUsd: Number(investAmount) }, "Investment placed")}>
                  Invest from Joint Account
                </Button>
              </Card>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-1">
              {(["overview", "holdings", "history", "activity"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition-colors",
                    tab === t ? "text-[var(--text-primary)] border-b-2 border-accent-brand -mb-[3px]" : "text-[var(--text-secondary)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "holdings" && (
              <Card>
                {data.holdings.length === 0 ? (
                  <p className="text-center py-8 text-[var(--text-secondary)]">No investments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.holdings.map((h) => (
                      <div key={h.symbol} className="flex items-center justify-between gap-3 py-3 border-b border-[var(--border-subtle)]/50 last:border-0">
                        <div className="flex items-center gap-3">
                          <StockIcon symbol={h.symbol} name={h.name} size="sm" />
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{h.symbol}</p>
                            <p className="text-xs text-[var(--text-muted)]">{h.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[var(--text-primary)]">{formatCurrency(h.marketValue)}</p>
                          <p className={cn("text-xs font-mono", h.gainLoss >= 0 ? "text-accent-green" : "text-accent-red")}>
                            {h.gainLoss >= 0 ? "+" : ""}{h.gainLossPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {tab === "history" && (
              <Card>
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <History size={18} /> Transaction History
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-right py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t) => (
                        <tr key={t.id} className="border-b border-[var(--border-subtle)]/50">
                          <td className="py-3 text-[var(--text-muted)]">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className="py-3">{t.type}</td>
                          <td className="py-3 text-right font-mono">{formatCurrency(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === "activity" && (
              <Card>
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Activity size={18} /> Activity Timeline
                </h3>
                <div className="space-y-3">
                  {data.activity.map((a) => (
                    <div key={a.id} className="flex gap-3 items-start">
                      <div className="h-2 w-2 rounded-full bg-accent-brand mt-2 shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">{a.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-[var(--text-muted)]">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {tab === "overview" && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3">Recent Transactions</h3>
                  {data.transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex justify-between py-2 border-b border-[var(--border-subtle)]/50 text-sm">
                      <span className="text-[var(--text-secondary)]">{t.description}</span>
                      <span className="font-mono">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </Card>
                <Card>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-3">Investment History</h3>
                  {data.investmentHistory.slice(0, 5).map((i) => (
                    <div key={i.id} className="flex justify-between py-2 border-b border-[var(--border-subtle)]/50 text-sm">
                      <span className="text-[var(--text-secondary)]">{i.symbol} — {i.assetName}</span>
                      <span className="font-mono">{formatCurrency(i.totalCost)}</span>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />
    </DashboardGate>
  );
}
