"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface DepositRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accountId: string | null;
  accountName: string | null;
  amountUsd: number | null;
  bitcoinWalletAddress: string | null;
  txHash: string | null;
  proofNote: string | null;
  status: string;
  statusLabel: string;
  reviewNote: string | null;
  createdAt: string;
}

function resolveCreditAmount(row: DepositRow, creditAmount: Record<string, string>) {
  const raw = creditAmount[row.id] ?? row.amountUsd?.toString() ?? "";
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export default function AdminDepositsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ deposits: DepositRow[] }>("/api/admin/deposits");
  const deposits = data?.deposits ?? [];
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filtered = filter === "pending" ? deposits.filter((d) => d.status === "PENDING") : deposits;

  const review = async (id: string, status: "APPROVED" | "REJECTED", reviewNote?: string) => {
    const row = deposits.find((d) => d.id === id);
    if (status === "APPROVED" && row) {
      const credit = resolveCreditAmount(row, creditAmount);
      if (!credit) {
        toast.error("Enter a valid credit amount before approving");
        return;
      }
    }

    setReviewing(id);
    try {
      const body: Record<string, unknown> = { status };
      if (status === "APPROVED" && row) {
        body.creditAmount = resolveCreditAmount(row, creditAmount);
        if (row.accountId) body.accountId = row.accountId;
      }
      if (status === "REJECTED" && reviewNote) {
        body.reviewNote = reviewNote;
      }
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      toast.success(status === "APPROVED" ? "Deposit approved and balance credited" : "Deposit rejected — user notified");
      setRejectId(null);
      setRejectReason("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setReviewing(null);
    }
  };

  const submitReject = () => {
    if (!rejectId || !rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    review(rejectId, "REJECTED", rejectReason.trim());
  };

  return (
    <div>
      <AdminPageHeader
        title="Deposit Management"
        description="Review Bitcoin deposit requests — approve to credit user balances and notify customers"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`text-xs px-4 py-2 rounded-lg border ${filter === "pending" ? "admin-btn-primary border-transparent" : "admin-btn-ghost"}`}
        >
          Pending ({deposits.filter((d) => d.status === "PENDING").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`text-xs px-4 py-2 rounded-lg border ${filter === "all" ? "admin-btn-primary border-transparent" : "admin-btn-ghost"}`}
        >
          All ({deposits.length})
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && filtered.length === 0}
          emptyMessage={filter === "pending" ? "No pending deposit requests" : "No deposit requests in the database"}
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">User</th>
                  <th className="text-left py-3 px-5">User ID</th>
                  <th className="text-left py-3 px-5">Amount</th>
                  <th className="text-left py-3 px-5">Account</th>
                  <th className="text-left py-3 px-5">Note</th>
                  <th className="text-left py-3 px-5">BTC Wallet</th>
                  <th className="text-left py-3 px-5">TX Reference</th>
                  <th className="text-left py-3 px-5">Status</th>
                  <th className="text-left py-3 px-5">Submitted</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--admin-border)]/50">
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${d.userId}`} className="admin-link text-sm">
                        {d.userName}
                      </Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{d.userEmail}</p>
                    </td>
                    <td className="py-3 px-5 font-mono text-[10px] text-[var(--admin-muted)] max-w-[100px] truncate" title={d.userId}>
                      {d.userId}
                    </td>
                    <td className="py-3 px-5 text-sm">{d.amountUsd != null ? formatCurrency(d.amountUsd) : "—"}</td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">{d.accountName ?? "—"}</td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)] max-w-[120px] truncate" title={d.proofNote ?? ""}>
                      {d.proofNote ?? "—"}
                    </td>
                    <td className="py-3 px-5 font-mono text-[10px] max-w-[120px] truncate" title={d.bitcoinWalletAddress ?? ""}>
                      {d.bitcoinWalletAddress ?? "—"}
                    </td>
                    <td className="py-3 px-5 font-mono text-xs max-w-[120px] truncate" title={d.txHash ?? ""}>
                      {d.txHash ?? "—"}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`admin-badge ${
                          d.status === "PENDING"
                            ? "admin-badge-submitted"
                            : d.status === "APPROVED"
                              ? "admin-badge-verified"
                              : "admin-badge-rejected"
                        }`}
                      >
                        {d.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-5 text-right">
                      {d.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <input
                            type="number"
                            placeholder="Credit $"
                            className="admin-input w-24 text-xs py-1"
                            value={creditAmount[d.id] ?? d.amountUsd?.toString() ?? ""}
                            onChange={(e) => setCreditAmount((p) => ({ ...p, [d.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => review(d.id, "APPROVED")}
                            disabled={reviewing === d.id}
                            className="admin-btn-primary text-xs py-1 px-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectId(d.id);
                              setRejectReason("");
                            }}
                            disabled={reviewing === d.id}
                            className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {d.status === "REJECTED" && d.reviewNote && (
                        <p className="text-[10px] text-red-400 max-w-[140px] ml-auto text-right">{d.reviewNote}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminFetchState>
      </div>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="admin-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-white font-semibold">Reject deposit request</h3>
            <p className="text-sm text-[var(--admin-muted)]">Provide a reason — the user will be notified.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="admin-input w-full min-h-[100px] text-sm"
              placeholder="Reason for rejection..."
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="admin-btn-ghost text-xs px-4 py-2" onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-ghost text-xs text-red-400 px-4 py-2"
                onClick={submitReject}
                disabled={reviewing === rejectId}
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
