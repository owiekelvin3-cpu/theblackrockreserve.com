"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import AdminActionModal from "@/components/admin/AdminActionModal";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminFilterTabs,
  AdminFormPanel,
  AdminDataCard,
  AdminTableScroll,
  AdminMobileList,
  AdminMobileCard,
  AdminModal,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface TaxRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  percentage: number;
  active: boolean;
  createdByName: string;
  updatedAt: string;
}

interface PaymentRow {
  id: string;
  userName: string;
  userEmail: string;
  profitAmount: number;
  taxPercentage: number;
  amountUsd: number;
  status: string;
  paymentMethod: string;
  txHash: string | null;
  proofNote: string | null;
  proofImage: string | null;
  createdAt: string;
}

type Tab = "taxes" | "payments";
type PendingPaymentAction = { id: string; status: "PAID" | "REJECTED" };

function PaymentSummary({
  payment,
  onViewProof,
}: {
  payment: PaymentRow;
  onViewProof?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-white/[0.02] p-4 space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">User</span>
        <span className="text-right text-white">{payment.userName}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">Profit amount</span>
        <span className="text-right">{formatCurrency(payment.profitAmount)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">Tax</span>
        <span className="font-semibold text-white">
          {formatCurrency(payment.amountUsd)}
          <span className="block text-xs text-[var(--admin-muted)]">{payment.taxPercentage}%</span>
        </span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-[var(--admin-muted)]">Method</span>
        <span className="text-right text-xs">{payment.paymentMethod}</span>
      </div>
      {payment.proofImage && (
        <div className="flex justify-between gap-3 items-center">
          <span className="text-[var(--admin-muted)]">Screenshot</span>
          <button type="button" onClick={onViewProof} className="admin-link text-xs">
            View screenshot
          </button>
        </div>
      )}
      {payment.txHash && (
        <div className="flex justify-between gap-3">
          <span className="text-[var(--admin-muted)]">TX reference</span>
          <span className="text-right font-mono text-xs break-all max-w-[220px]">{payment.txHash}</span>
        </div>
      )}
    </div>
  );
}

export default function AdminProfitTaxPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{
    taxes: TaxRow[];
    users: { id: string; name: string; email: string }[];
  }>("/api/admin/profit-tax");
  const paymentsFetch = useAdminFetch<{ payments: PaymentRow[] }>("/api/admin/profit-tax-payments");
  const [tab, setTab] = useState<Tab>("payments");
  const [tabInitialized, setTabInitialized] = useState(false);
  const [userId, setUserId] = useState("");
  const [percentage, setPercentage] = useState("10");
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<PendingPaymentAction | null>(null);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);
  const [confirmSaveSingle, setConfirmSaveSingle] = useState(false);
  const [proofPreview, setProofPreview] = useState<PaymentRow | null>(null);

  const taxes = data?.taxes ?? [];
  const users = data?.users ?? [];
  const payments = paymentsFetch.data?.payments ?? [];
  const pendingPaymentCount = payments.filter((p) => p.status === "PENDING_VERIFICATION").length;
  const selectedUser = users.find((u) => u.id === userId);
  const taxToRemove = taxes.find((t) => t.userId === removeUserId);
  const selectedPayment = payments.find((p) => p.id === pendingPaymentAction?.id);

  useEffect(() => {
    if (tabInitialized || paymentsFetch.loading) return;
    setTab(pendingPaymentCount > 0 ? "payments" : "taxes");
    setTabInitialized(true);
  }, [tabInitialized, paymentsFetch.loading, pendingPaymentCount]);

  const saveTax = async (applyToAll = false) => {
    const pct = Number(percentage);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast.error("Enter a valid percentage between 0 and 100");
      return;
    }
    if (!applyToAll && !userId) {
      toast.error("Select a user");
      return;
    }

    if (applyToAll) setSavingAll(true);
    else setSaving(true);

    try {
      const res = await fetch("/api/admin/profit-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          applyToAll,
          userId: applyToAll ? undefined : userId,
          percentage: pct,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      toast.success(json.message);
      setConfirmApplyAll(false);
      setConfirmSaveSingle(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
      setSavingAll(false);
    }
  };

  const removeTax = async () => {
    if (!removeUserId) return;
    try {
      const res = await fetch(`/api/admin/profit-tax/${removeUserId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove");
      toast.success("Profit tax removed");
      setRemoveUserId(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const reviewPayment = async (id: string, status: "PAID" | "REJECTED", reviewNote?: string) => {
    setReviewing(id);
    try {
      const res = await fetch(`/api/admin/profit-tax-payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reviewNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      toast.success(status === "PAID" ? "Tax verified — profit released" : "Tax payment rejected");
      setPendingPaymentAction(null);
      paymentsFetch.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Profit Tax"
        description="Set a percentage tax on profit withdrawals. Users pay from main balance or externally before profit is released."
        action={
          <AdminRefreshButton
            onClick={() => {
              refresh();
              paymentsFetch.refresh();
            }}
          />
        }
      />

      <AdminFilterTabs
        value={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "payments", label: "Payments", count: pendingPaymentCount || undefined },
          { id: "taxes", label: "Tax rates" },
        ]}
      />

      {tab === "taxes" && (
        <>
          <AdminFormPanel title="Set profit tax">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="admin-label">User</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="admin-input w-full"
                >
                  <option value="">Select user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Percentage %</label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmSaveSingle(true)}
                  className="admin-btn-primary text-sm px-4 py-2"
                >
                  Save for user
                </button>
                <button
                  type="button"
                  disabled={savingAll}
                  onClick={() => setConfirmApplyAll(true)}
                  className="admin-btn-ghost text-sm px-4 py-2"
                >
                  Apply to all
                </button>
              </div>
            </div>
          </AdminFormPanel>

          <AdminDataCard noPadding>
            <AdminFetchState
              loading={loading}
              error={error}
              onRetry={refresh}
              lastUpdated={lastUpdated}
              isEmpty={!loading && taxes.length === 0}
              emptyMessage="No per-user profit taxes set"
            >
              <AdminTableScroll className="admin-desktop-table">
                <table className="admin-table w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                      <th className="text-left py-3 px-5">User</th>
                      <th className="text-left py-3 px-5">Rate</th>
                      <th className="text-left py-3 px-5">Status</th>
                      <th className="text-right py-3 px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxes.map((t) => (
                      <tr key={t.id} className="border-b border-[var(--admin-border)]/50">
                        <td className="py-3 px-5">
                          <p className="text-sm">{t.userName}</p>
                          <p className="text-[10px] text-[var(--admin-muted)]">{t.userEmail}</p>
                        </td>
                        <td className="py-3 px-5 font-medium">{t.percentage}%</td>
                        <td className="py-3 px-5">
                          <span className="admin-badge admin-badge-submitted">
                            {t.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setRemoveUserId(t.userId)}
                            className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableScroll>
            </AdminFetchState>
          </AdminDataCard>
        </>
      )}

      {tab === "payments" && (
        <AdminDataCard noPadding>
          <AdminFetchState
            loading={paymentsFetch.loading}
            error={paymentsFetch.error}
            onRetry={paymentsFetch.refresh}
            lastUpdated={paymentsFetch.lastUpdated}
            isEmpty={!paymentsFetch.loading && payments.length === 0}
            emptyMessage="No profit tax payments yet"
          >
            <AdminMobileList>
              {payments.map((p) => (
                <AdminMobileCard key={p.id}>
                  <p className="text-sm font-medium">{p.userName}</p>
                  <p className="text-[10px] text-[var(--admin-muted)]">{p.userEmail}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2 mb-3">
                    <div>
                      <p className="text-[var(--admin-muted)]">Profit</p>
                      <p>{formatCurrency(p.profitAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--admin-muted)]">Tax</p>
                      <p className="font-medium">{formatCurrency(p.amountUsd)}</p>
                    </div>
                  </div>
                  {p.proofImage && (
                    <button
                      type="button"
                      onClick={() => setProofPreview(p)}
                      className="admin-link text-xs mb-2"
                    >
                      View screenshot
                    </button>
                  )}
                  {p.status === "PENDING_VERIFICATION" && (
                    <div className="flex gap-2">
                      <button
                        disabled={reviewing === p.id}
                        onClick={() => setPendingPaymentAction({ id: p.id, status: "PAID" })}
                        className="admin-btn-primary text-xs py-1 px-3 flex-1"
                      >
                        Confirm
                      </button>
                      <button
                        disabled={reviewing === p.id}
                        onClick={() => setPendingPaymentAction({ id: p.id, status: "REJECTED" })}
                        className="admin-btn-ghost text-xs text-red-400 py-1 px-3 flex-1"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </AdminMobileCard>
              ))}
            </AdminMobileList>

            <AdminTableScroll className="admin-desktop-table">
              <table className="admin-table w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                    <th className="text-left py-3 px-5">User</th>
                    <th className="text-left py-3 px-5">Profit</th>
                    <th className="text-left py-3 px-5">Tax</th>
                    <th className="text-left py-3 px-5">Proof</th>
                    <th className="text-left py-3 px-5">Status</th>
                    <th className="text-right py-3 px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--admin-border)]/50">
                      <td className="py-3 px-5">
                        <p className="text-sm">{p.userName}</p>
                        <p className="text-[10px] text-[var(--admin-muted)]">{p.userEmail}</p>
                      </td>
                      <td className="py-3 px-5 text-sm">{formatCurrency(p.profitAmount)}</td>
                      <td className="py-3 px-5 font-medium">
                        {formatCurrency(p.amountUsd)}
                        <p className="text-[10px] text-[var(--admin-muted)]">{p.taxPercentage}%</p>
                      </td>
                      <td className="py-3 px-5 text-xs max-w-[160px]">
                        {p.proofImage && (
                          <button
                            type="button"
                            onClick={() => setProofPreview(p)}
                            className="admin-link block mb-1"
                          >
                            View screenshot
                          </button>
                        )}
                        {p.txHash && (
                          <p className="font-mono truncate" title={p.txHash}>
                            {p.txHash}
                          </p>
                        )}
                        {!p.proofImage && !p.txHash && (
                          <span className="text-[var(--admin-muted)]">{p.paymentMethod}</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <span className="admin-badge admin-badge-submitted">{p.status}</span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        {p.status === "PENDING_VERIFICATION" && (
                          <div className="flex justify-end gap-2 flex-wrap">
                            <button
                              disabled={reviewing === p.id}
                              onClick={() => setPendingPaymentAction({ id: p.id, status: "PAID" })}
                              className="admin-btn-primary text-xs py-1 px-3"
                            >
                              Confirm
                            </button>
                            <button
                              disabled={reviewing === p.id}
                              onClick={() => setPendingPaymentAction({ id: p.id, status: "REJECTED" })}
                              className="admin-btn-ghost text-xs text-red-400 py-1 px-3"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
          </AdminFetchState>
        </AdminDataCard>
      )}

      {confirmSaveSingle && selectedUser && (
        <AdminActionModal
          open
          title="Confirm profit tax"
          description="This tax percentage will apply when the user withdraws profit."
          confirmLabel="Confirm tax"
          onClose={() => setConfirmSaveSingle(false)}
          onConfirm={() => saveTax(false)}
          loading={saving}
        >
          <div className="rounded-lg border border-[var(--admin-border)] bg-white/[0.02] p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[var(--admin-muted)]">User</span>
              <span className="text-right text-white">{selectedUser.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--admin-muted)]">Rate</span>
              <span className="font-semibold text-white">{percentage}%</span>
            </div>
          </div>
        </AdminActionModal>
      )}

      {confirmApplyAll && (
        <AdminActionModal
          open
          title="Apply profit tax to all users"
          description="Sets this percentage for every verified customer and updates the platform default."
          confirmLabel="Apply to all"
          onClose={() => setConfirmApplyAll(false)}
          onConfirm={() => saveTax(true)}
          loading={savingAll}
        >
          <p className="text-sm text-white">
            Rate: <strong>{percentage}%</strong>
          </p>
        </AdminActionModal>
      )}

      {taxToRemove && (
        <AdminActionModal
          open
          title="Remove profit tax"
          description="This user will no longer be charged tax on profit withdrawals (unless a platform default is enabled)."
          confirmLabel="Confirm removal"
          variant="danger"
          onClose={() => setRemoveUserId(null)}
          onConfirm={removeTax}
        >
          <div className="rounded-lg border border-[var(--admin-border)] bg-white/[0.02] p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[var(--admin-muted)]">User</span>
              <span className="text-right text-white">{taxToRemove.userName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--admin-muted)]">Current rate</span>
              <span className="font-semibold text-white">{taxToRemove.percentage}%</span>
            </div>
          </div>
        </AdminActionModal>
      )}

      {selectedPayment && pendingPaymentAction?.status === "PAID" && (
        <AdminActionModal
          open
          title="Confirm profit tax payment"
          description="Verify the tax payment. The held profit will be credited to the user's main balance."
          confirmLabel="Confirm payment"
          onClose={() => setPendingPaymentAction(null)}
          onConfirm={() => reviewPayment(pendingPaymentAction.id, "PAID")}
          loading={reviewing === pendingPaymentAction.id}
        >
          <PaymentSummary
            payment={selectedPayment}
            onViewProof={() => setProofPreview(selectedPayment)}
          />
        </AdminActionModal>
      )}

      {selectedPayment && pendingPaymentAction?.status === "REJECTED" && (
        <AdminActionModal
          open
          title="Reject profit tax payment"
          description="Provide a reason — the user will be notified and can submit new proof."
          confirmLabel="Confirm rejection"
          variant="danger"
          requireReason
          reasonLabel="Rejection reason"
          reasonPlaceholder="Reason for rejection..."
          onClose={() => setPendingPaymentAction(null)}
          onConfirm={(reviewNote) => reviewPayment(pendingPaymentAction.id, "REJECTED", reviewNote)}
          loading={reviewing === pendingPaymentAction.id}
        >
          <PaymentSummary
            payment={selectedPayment}
            onViewProof={() => setProofPreview(selectedPayment)}
          />
        </AdminActionModal>
      )}

      <AdminModal
        open={!!proofPreview?.proofImage}
        onClose={() => setProofPreview(null)}
        title="Tax payment screenshot"
        description={
          proofPreview
            ? `${proofPreview.userName} · ${formatCurrency(proofPreview.amountUsd)}`
            : undefined
        }
        footer={
          <button
            type="button"
            className="admin-btn-ghost text-xs px-4 py-2"
            onClick={() => setProofPreview(null)}
          >
            Close
          </button>
        }
      >
        {proofPreview?.proofImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proofPreview.proofImage}
            alt="Tax payment screenshot"
            className="w-full max-h-[70vh] object-contain rounded-lg border border-[var(--admin-border)]"
          />
        )}
      </AdminModal>
    </AdminPage>
  );
}
