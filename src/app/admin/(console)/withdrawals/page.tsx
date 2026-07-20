"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import AdminActionModal from "@/components/admin/AdminActionModal";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminFilterTabs,
  AdminDataCard,
  AdminTableScroll,
  AdminMobileList,
  AdminMobileCard,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface WithdrawalRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accountName: string;
  accountBalance: number | null;
  method: string;
  methodLabel: string;
  amountUsd: number;
  assignedChargeAmount: number | null;
  chargePaymentId: string | null;
  chargePaymentStatus: string | null;
  chargePaymentTxHash: string | null;
  chargePaymentProofImage: string | null;
  destination: string;
  destinationExtra: string | null;
  note: string | null;
  status: string;
  createdAt: string;
}

type WithdrawalReviewAction = { kind: "withdrawal"; id: string; status: "APPROVED" | "REJECTED" };
type ChargeReviewAction = { kind: "charge"; chargePaymentId: string; withdrawalId: string; status: "PAID" | "REJECTED" };
type PendingAction = WithdrawalReviewAction | ChargeReviewAction;

function statusLabel(status: string) {
  if (status === "AWAITING_CHARGE_PAYMENT") return "Awaiting Charge";
  return status;
}

function needsWithdrawalReview(w: WithdrawalRow) {
  return w.status === "PENDING";
}

function needsChargeReview(w: WithdrawalRow) {
  return (
    w.status === "AWAITING_CHARGE_PAYMENT" &&
    w.chargePaymentStatus === "PENDING_VERIFICATION" &&
    !!w.chargePaymentId
  );
}

function isActionable(w: WithdrawalRow) {
  return needsWithdrawalReview(w) || needsChargeReview(w);
}

function WithdrawalSummary({ withdrawal }: { withdrawal: WithdrawalRow }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-white/[0.02] p-4 space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">User</span>
        <span className="text-right text-white">{withdrawal.userName}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">Amount</span>
        <span className="font-semibold text-white">{formatCurrency(withdrawal.amountUsd)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">Method</span>
        <span className="text-right">{withdrawal.methodLabel}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">Destination</span>
        <span className="text-right break-all max-w-[220px]">{withdrawal.destination}</span>
      </div>
      {withdrawal.accountName && (
        <div className="flex justify-between gap-3">
          <span className="text-[var(--admin-muted)]">Account</span>
          <span className="text-right">
            {withdrawal.accountName}
            {withdrawal.accountBalance != null && (
              <span className="block text-xs text-[var(--admin-muted)]">
                Balance: {formatCurrency(withdrawal.accountBalance)}
              </span>
            )}
          </span>
        </div>
      )}
      {withdrawal.assignedChargeAmount != null && (
        <div className="flex justify-between gap-3">
          <span className="text-[var(--admin-muted)]">Processing charge</span>
          <span className="text-right">
            {formatCurrency(withdrawal.assignedChargeAmount)}
            {withdrawal.chargePaymentStatus && (
              <span className="block text-xs text-[var(--admin-muted)]">{withdrawal.chargePaymentStatus}</span>
            )}
          </span>
        </div>
      )}
      {withdrawal.chargePaymentProofImage && (
        <div className="flex justify-between gap-3 items-center">
          <span className="text-[var(--admin-muted)]">Charge screenshot</span>
          <a
            href={withdrawal.chargePaymentProofImage}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-link text-xs"
          >
            View screenshot
          </a>
        </div>
      )}
      {withdrawal.chargePaymentTxHash && (
        <div className="flex justify-between gap-3">
          <span className="text-[var(--admin-muted)]">TX reference</span>
          <span className="text-right font-mono text-xs break-all max-w-[220px]">{withdrawal.chargePaymentTxHash}</span>
        </div>
      )}
    </div>
  );
}

function WithdrawalActions({
  withdrawal,
  reviewing,
  onWithdrawalAction,
  onChargeAction,
  layout = "row",
}: {
  withdrawal: WithdrawalRow;
  reviewing: string | null;
  onWithdrawalAction: (id: string, status: "APPROVED" | "REJECTED") => void;
  onChargeAction: (chargePaymentId: string, withdrawalId: string, status: "PAID" | "REJECTED") => void;
  layout?: "row" | "stack";
}) {
  const busy = reviewing === withdrawal.id || reviewing === withdrawal.chargePaymentId;
  const stackClass = layout === "stack" ? "flex-col" : "flex-row flex-wrap justify-end";

  if (needsChargeReview(withdrawal)) {
    return (
      <div className={`flex gap-2 ${stackClass}`}>
        <button
          onClick={() =>
            onChargeAction(withdrawal.chargePaymentId!, withdrawal.id, "PAID")
          }
          disabled={busy}
          className="admin-btn-primary text-xs py-1 px-3"
        >
          Confirm charge
        </button>
        <button
          onClick={() =>
            onChargeAction(withdrawal.chargePaymentId!, withdrawal.id, "REJECTED")
          }
          disabled={busy}
          className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
        >
          Reject charge
        </button>
        <button
          onClick={() => onWithdrawalAction(withdrawal.id, "REJECTED")}
          disabled={busy}
          className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
          title="Cancel withdrawal and return funds"
        >
          Cancel & refund
        </button>
      </div>
    );
  }

  if (needsWithdrawalReview(withdrawal)) {
    return (
      <div className={`flex gap-2 ${stackClass}`}>
        <button
          onClick={() => onWithdrawalAction(withdrawal.id, "APPROVED")}
          disabled={busy}
          className="admin-btn-primary text-xs py-1 px-3"
        >
          Confirm withdrawal
        </button>
        <button
          onClick={() => onWithdrawalAction(withdrawal.id, "REJECTED")}
          disabled={busy}
          className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
        >
          Reject
        </button>
      </div>
    );
  }

  if (withdrawal.status === "AWAITING_CHARGE_PAYMENT") {
    return (
      <div className={`flex gap-2 ${stackClass} items-end`}>
        <p className="text-[10px] text-[var(--admin-muted)] max-w-[140px] text-right">
          Waiting for user charge payment
        </p>
        <button
          onClick={() => onWithdrawalAction(withdrawal.id, "REJECTED")}
          disabled={busy}
          className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
          title="Cancel withdrawal and return funds"
        >
          Cancel & refund
        </button>
      </div>
    );
  }

  return null;
}

export default function AdminWithdrawalsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ withdrawals: WithdrawalRow[] }>(
    "/api/admin/withdrawals"
  );
  const withdrawals = data?.withdrawals ?? [];
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const actionableCount = withdrawals.filter(isActionable).length;
  const filtered =
    filter === "pending" ? withdrawals.filter(isActionable) : withdrawals;

  const selectedWithdrawal = pendingAction
    ? withdrawals.find((w) =>
        pendingAction.kind === "withdrawal"
          ? w.id === pendingAction.id
          : w.id === pendingAction.withdrawalId
      ) ?? null
    : null;

  const reviewWithdrawal = async (id: string, status: "APPROVED" | "REJECTED", reviewNote?: string) => {
    setReviewing(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reviewNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      toast.success(
        status === "APPROVED"
          ? "Withdrawal confirmed and balance debited"
          : "Withdrawal rejected — user notified"
      );
      setPendingAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setReviewing(null);
    }
  };

  const reviewCharge = async (chargePaymentId: string, status: "PAID" | "REJECTED", reviewNote?: string) => {
    setReviewing(chargePaymentId);
    try {
      const res = await fetch(`/api/admin/withdrawal-charge-payments/${chargePaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reviewNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(
        status === "PAID"
          ? "Charge payment confirmed — withdrawal moved to review"
          : "Charge payment rejected — user notified"
      );
      setPendingAction(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Withdrawal Requests"
        description="Confirm charge payments first, then approve withdrawals ready for payout"
        action={<AdminRefreshButton onClick={refresh} />}
      />

      <AdminFilterTabs
        value={filter}
        onChange={(v) => setFilter(v as "pending" | "all")}
        tabs={[
          { id: "pending", label: "Needs action", count: actionableCount },
          { id: "all", label: "All", count: withdrawals.length },
        ]}
      />

      <AdminDataCard noPadding>
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && filtered.length === 0}
          emptyMessage={
            filter === "pending"
              ? "No withdrawals or charge payments awaiting your review"
              : "No withdrawal requests in the database"
          }
        >
          <AdminMobileList>
            {filtered.map((w) => (
              <AdminMobileCard key={w.id}>
                <div className="flex justify-between gap-2 mb-2">
                  <div>
                    <Link href={`/admin/users/${w.userId}`} className="admin-link text-sm font-medium">
                      {w.userName}
                    </Link>
                    <p className="text-[10px] text-[var(--admin-muted)]">{w.userEmail}</p>
                  </div>
                  <span className="admin-badge admin-badge-submitted text-[10px]">{statusLabel(w.status)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-[var(--admin-muted)]">Amount</p>
                    <p className="font-medium">{formatCurrency(w.amountUsd)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--admin-muted)]">Charge</p>
                    <p>{w.assignedChargeAmount != null ? formatCurrency(w.assignedChargeAmount) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[var(--admin-muted)]">Method</p>
                    <p>{w.methodLabel}</p>
                  </div>
                  <div>
                    <p className="text-[var(--admin-muted)]">Date</p>
                    <p>{new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <WithdrawalActions
                  withdrawal={w}
                  reviewing={reviewing}
                  layout="stack"
                  onWithdrawalAction={(id, status) =>
                    setPendingAction({ kind: "withdrawal", id, status })
                  }
                  onChargeAction={(chargePaymentId, withdrawalId, status) =>
                    setPendingAction({ kind: "charge", chargePaymentId, withdrawalId, status })
                  }
                />
              </AdminMobileCard>
            ))}
          </AdminMobileList>

          <AdminTableScroll className="admin-desktop-table">
            <table className="admin-table w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">User</th>
                  <th className="text-left py-3 px-5">Amount</th>
                  <th className="text-left py-3 px-5">Charge</th>
                  <th className="text-left py-3 px-5">Method</th>
                  <th className="text-left py-3 px-5">Status</th>
                  <th className="text-left py-3 px-5">Date</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-b border-[var(--admin-border)]/50">
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${w.userId}`} className="admin-link text-sm">
                        {w.userName}
                      </Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{w.userEmail}</p>
                    </td>
                    <td className="py-3 px-5 text-sm font-medium">{formatCurrency(w.amountUsd)}</td>
                    <td className="py-3 px-5 text-sm">
                      {w.assignedChargeAmount != null ? (
                        <>
                          {formatCurrency(w.assignedChargeAmount)}
                          {w.chargePaymentStatus && (
                            <p className="text-[10px] text-[var(--admin-muted)]">{w.chargePaymentStatus}</p>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-5 text-sm">{w.methodLabel}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`admin-badge ${
                          w.status === "PENDING"
                            ? "admin-badge-submitted"
                            : w.status === "AWAITING_CHARGE_PAYMENT"
                              ? "admin-badge-submitted"
                              : w.status === "APPROVED"
                                ? "admin-badge-verified"
                                : "admin-badge-rejected"
                        }`}
                      >
                        {statusLabel(w.status)}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <WithdrawalActions
                        withdrawal={w}
                        reviewing={reviewing}
                        onWithdrawalAction={(id, status) =>
                          setPendingAction({ kind: "withdrawal", id, status })
                        }
                        onChargeAction={(chargePaymentId, withdrawalId, status) =>
                          setPendingAction({ kind: "charge", chargePaymentId, withdrawalId, status })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        </AdminFetchState>
      </AdminDataCard>

      {selectedWithdrawal && pendingAction?.kind === "withdrawal" && pendingAction.status === "APPROVED" && (
        <AdminActionModal
          open
          title="Confirm withdrawal"
          description="This will debit the user's account balance and mark the withdrawal as approved. The customer will be notified."
          confirmLabel="Confirm withdrawal"
          onClose={() => setPendingAction(null)}
          onConfirm={() => reviewWithdrawal(pendingAction.id, "APPROVED")}
          loading={reviewing === pendingAction.id}
        >
          <WithdrawalSummary withdrawal={selectedWithdrawal} />
        </AdminActionModal>
      )}

      {selectedWithdrawal && pendingAction?.kind === "withdrawal" && pendingAction.status === "REJECTED" && (
        <AdminActionModal
          open
          title="Reject withdrawal request"
          description="Provide a reason — the user will be notified."
          confirmLabel="Confirm rejection"
          variant="danger"
          requireReason
          reasonLabel="Rejection reason"
          reasonPlaceholder="Reason for rejection..."
          onClose={() => setPendingAction(null)}
          onConfirm={(reviewNote) => reviewWithdrawal(pendingAction.id, "REJECTED", reviewNote)}
          loading={reviewing === pendingAction.id}
        >
          <WithdrawalSummary withdrawal={selectedWithdrawal} />
        </AdminActionModal>
      )}

      {selectedWithdrawal && pendingAction?.kind === "charge" && pendingAction.status === "PAID" && (
        <AdminActionModal
          open
          title="Confirm charge payment"
          description="Verify that the liquidity deposit was received. The withdrawal will move to pending payout review."
          confirmLabel="Confirm charge"
          onClose={() => setPendingAction(null)}
          onConfirm={() => reviewCharge(pendingAction.chargePaymentId, "PAID")}
          loading={reviewing === pendingAction.chargePaymentId}
        >
          <WithdrawalSummary withdrawal={selectedWithdrawal} />
        </AdminActionModal>
      )}

      {selectedWithdrawal && pendingAction?.kind === "charge" && pendingAction.status === "REJECTED" && (
        <AdminActionModal
          open
          title="Reject charge payment"
          description="Provide a reason — the user will be notified and can submit new proof."
          confirmLabel="Confirm rejection"
          variant="danger"
          requireReason
          reasonLabel="Rejection reason"
          reasonPlaceholder="Reason for rejection..."
          onClose={() => setPendingAction(null)}
          onConfirm={(reviewNote) => reviewCharge(pendingAction.chargePaymentId, "REJECTED", reviewNote)}
          loading={reviewing === pendingAction.chargePaymentId}
        >
          <WithdrawalSummary withdrawal={selectedWithdrawal} />
        </AdminActionModal>
      )}
    </AdminPage>
  );
}
