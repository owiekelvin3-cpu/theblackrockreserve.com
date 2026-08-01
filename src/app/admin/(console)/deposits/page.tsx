"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminFilterTabs,
  AdminDataCard,
  AdminTableScroll,
  AdminMobileList,
  AdminMobileCard,
  AdminModal,
} from "@/components/admin/AdminUi";
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
  proofImage: string | null;
  hasProofImage: boolean;
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

function DepositStatusBadge({ status, label }: { status: string; label: string }) {
  const cls =
    status === "PENDING"
      ? "admin-badge-submitted"
      : status === "APPROVED"
        ? "admin-badge-verified"
        : "admin-badge-rejected";
  return <span className={`admin-badge ${cls}`}>{label}</span>;
}

function DepositActions({
  d,
  reviewing,
  creditAmount,
  setCreditAmount,
  onApprove,
  onReject,
}: {
  d: DepositRow;
  reviewing: string | null;
  creditAmount: Record<string, string>;
  setCreditAmount: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (d.status !== "PENDING") {
    return d.status === "REJECTED" && d.reviewNote ? (
      <p className="text-[10px] text-red-400">{d.reviewNote}</p>
    ) : null;
  }
  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      <input
        type="number"
        placeholder="Credit $"
        className="admin-input w-24 text-xs py-1"
        value={creditAmount[d.id] ?? d.amountUsd?.toString() ?? ""}
        onChange={(e) => setCreditAmount((p) => ({ ...p, [d.id]: e.target.value }))}
      />
      <button onClick={onApprove} disabled={reviewing === d.id} className="admin-btn-primary text-xs py-1 px-3">
        Approve
      </button>
      <button onClick={onReject} disabled={reviewing === d.id} className="admin-btn-ghost text-xs text-red-400 py-1 px-3">
        Reject
      </button>
    </div>
  );
}

function DepositProofCell({ d, onView }: { d: DepositRow; onView: () => void }) {
  if (d.proofImage) {
    return (
      <button type="button" onClick={onView} className="admin-link text-xs">
        View screenshot
      </button>
    );
  }
  if (d.txHash) {
    return (
      <span className="font-mono text-xs max-w-[120px] truncate block" title={d.txHash}>
        {d.txHash}
      </span>
    );
  }
  return <span className="text-[var(--admin-muted)]">—</span>;
}

export default function AdminDepositsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ deposits: DepositRow[] }>("/api/admin/deposits");
  const deposits = data?.deposits ?? [];
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [proofPreview, setProofPreview] = useState<DepositRow | null>(null);

  const pendingCount = deposits.filter((d) => d.status === "PENDING").length;
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
    <AdminPage>
      <AdminPageHeader
        title="Deposit Management"
        description="Review Bitcoin deposit requests — approve to credit user balances and notify customers"
        action={<AdminRefreshButton onClick={refresh} />}
      />

      <AdminFilterTabs
        value={filter}
        onChange={(v) => setFilter(v as "all" | "pending")}
        tabs={[
          { id: "pending", label: "Pending", count: pendingCount },
          { id: "all", label: "All", count: deposits.length },
        ]}
      />

      <AdminDataCard noPadding>
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && filtered.length === 0}
          emptyMessage={filter === "pending" ? "No pending deposit requests" : "No deposit requests in the database"}
        >
          <AdminMobileList>
            {filtered.map((d) => (
              <AdminMobileCard key={d.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${d.userId}`} className="admin-link text-sm font-medium">
                      {d.userName}
                    </Link>
                    <p className="text-[10px] text-[var(--admin-muted)] truncate">{d.userEmail}</p>
                  </div>
                  <DepositStatusBadge status={d.status} label={d.statusLabel} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-[var(--admin-muted)]">Amount</p>
                    <p className="admin-amount">{d.amountUsd != null ? formatCurrency(d.amountUsd) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[var(--admin-muted)]">Submitted</p>
                    <p>{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--admin-muted)]">Proof</p>
                    <DepositProofCell d={d} onView={() => setProofPreview(d)} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--admin-muted)]">Account</p>
                    <p>{d.accountName ?? "—"}</p>
                  </div>
                </div>
                <DepositActions
                  d={d}
                  reviewing={reviewing}
                  creditAmount={creditAmount}
                  setCreditAmount={setCreditAmount}
                  onApprove={() => review(d.id, "APPROVED")}
                  onReject={() => {
                    setRejectId(d.id);
                    setRejectReason("");
                  }}
                />
              </AdminMobileCard>
            ))}
          </AdminMobileList>

          <AdminTableScroll className="admin-desktop-table">
            <table className="admin-table w-full min-w-[960px]">
              <thead>
                <tr>
                  <th className="text-left">User</th>
                  <th className="text-left">Amount</th>
                  <th className="text-left">Account</th>
                  <th className="text-left">Note</th>
                  <th className="text-left">BTC Wallet</th>
                  <th className="text-left">Proof</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Submitted</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/admin/users/${d.userId}`} className="admin-link text-sm">
                        {d.userName}
                      </Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{d.userEmail}</p>
                    </td>
                    <td>{d.amountUsd != null ? formatCurrency(d.amountUsd) : "—"}</td>
                    <td className="text-xs text-[var(--admin-muted)]">{d.accountName ?? "—"}</td>
                    <td className="text-xs text-[var(--admin-muted)] max-w-[120px] truncate" title={d.proofNote ?? ""}>
                      {d.proofNote ?? "—"}
                    </td>
                    <td className="font-mono text-[10px] max-w-[120px] truncate" title={d.bitcoinWalletAddress ?? ""}>
                      {d.bitcoinWalletAddress ?? "—"}
                    </td>
                    <td>
                      <DepositProofCell d={d} onView={() => setProofPreview(d)} />
                    </td>
                    <td>
                      <DepositStatusBadge status={d.status} label={d.statusLabel} />
                    </td>
                    <td className="text-xs text-[var(--admin-muted)]">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="text-right">
                      <DepositActions
                        d={d}
                        reviewing={reviewing}
                        creditAmount={creditAmount}
                        setCreditAmount={setCreditAmount}
                        onApprove={() => review(d.id, "APPROVED")}
                        onReject={() => {
                          setRejectId(d.id);
                          setRejectReason("");
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        </AdminFetchState>
      </AdminDataCard>

      <AdminModal
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        title="Reject deposit request"
        description="Provide a reason — the user will be notified."
        footer={
          <>
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
          </>
        }
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="admin-input w-full min-h-[100px] text-sm"
          placeholder="Reason for rejection..."
        />
      </AdminModal>

      <AdminModal
        open={!!proofPreview?.proofImage}
        onClose={() => setProofPreview(null)}
        title="Transaction proof"
        description={
          proofPreview
            ? `${proofPreview.userName} · ${proofPreview.amountUsd != null ? formatCurrency(proofPreview.amountUsd) : "Amount not set"}`
            : undefined
        }
        footer={
          <button type="button" className="admin-btn-ghost text-xs px-4 py-2" onClick={() => setProofPreview(null)}>
            Close
          </button>
        }
      >
        {proofPreview?.proofImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proofPreview.proofImage}
            alt="Transaction proof"
            className="w-full max-h-[70vh] object-contain rounded-lg border border-[var(--admin-border)]"
          />
        )}
      </AdminModal>
    </AdminPage>
  );
}
