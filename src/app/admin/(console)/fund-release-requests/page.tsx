"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HandCoins, CheckCircle, XCircle } from "lucide-react";
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

interface FundReleaseRow {
  id: string;
  status: string;
  userMessage: string | null;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    totalBalance: number;
  };
  freeze: {
    id: string;
    freezeTypeLabel: string;
    reason: string;
    internalNotes: string | null;
    frozenAt: string;
    frozenBy: { name: string };
  };
  reviewedBy: { name: string } | null;
}

type ReviewAction = { request: FundReleaseRow; action: "APPROVE" | "REJECT" };

const STATUS_TABS = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "", label: "All" },
];

export default function AdminFundReleaseRequestsPage() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const url =
    statusFilter && statusFilter !== ""
      ? `/api/admin/fund-release-requests?status=${statusFilter}`
      : "/api/admin/fund-release-requests";
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ requests: FundReleaseRow[] }>(url);
  const requests = data?.requests ?? [];

  const submitReview = async () => {
    if (!reviewAction) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fund-release-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          requestId: reviewAction.request.id,
          action: reviewAction.action,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      toast.success(
        reviewAction.action === "APPROVE"
          ? "Fund release approved — account unfrozen"
          : "Fund release request rejected"
      );
      setReviewAction(null);
      setAdminNotes("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Fund Release Requests"
        description="Review release requests from frozen accounts who contacted support."
        action={<AdminRefreshButton onClick={refresh} />}
      />

      <AdminFilterTabs
        tabs={STATUS_TABS}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      <AdminFetchState loading={loading} error={error} onRetry={refresh} lastUpdated={lastUpdated}>
        <AdminDataCard>
          <h2 className="font-semibold text-white mb-4 px-4 pt-4 flex items-center gap-2">
            <HandCoins size={18} className="text-emerald-400" />
            Requests ({requests.length})
          </h2>
          <div className="px-4 pb-4">
          {requests.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)] py-8 text-center">No fund release requests</p>
          ) : (
            <>
              <AdminTableScroll className="hidden lg:block">
                <table className="admin-table w-full">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)]">
                      <th className="text-left py-2">Customer</th>
                      <th className="text-left py-2">Freeze Reason</th>
                      <th className="text-left py-2">User Message</th>
                      <th className="text-right py-2">Balance</th>
                      <th className="text-left py-2">Requested</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--admin-border)]/50 align-top">
                        <td className="py-3">
                          <Link href={`/admin/users/${r.user.id}`} className="admin-link text-sm font-medium">
                            {r.user.name}
                          </Link>
                          <p className="text-[10px] text-[var(--admin-muted)]">{r.user.email}</p>
                          <p className="text-[10px] text-[var(--admin-muted)]">{r.freeze.freezeTypeLabel}</p>
                        </td>
                        <td className="py-3 text-sm text-[var(--admin-muted)] max-w-[180px]">{r.freeze.reason}</td>
                        <td className="py-3 text-sm text-[var(--admin-muted)] max-w-[200px]">
                          {r.userMessage ?? "—"}
                        </td>
                        <td className="py-3 text-right admin-amount">{formatCurrency(r.user.totalBalance)}</td>
                        <td className="py-3 text-xs text-[var(--admin-muted)]">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`admin-badge text-[10px] ${
                              r.status === "APPROVED"
                                ? "admin-badge-verified"
                                : r.status === "REJECTED"
                                  ? "admin-badge-rejected"
                                  : "admin-badge-submitted"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {r.status === "PENDING" ? (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                className="admin-btn-ghost text-[10px] px-2 py-1 text-emerald-400"
                                onClick={() => {
                                  setReviewAction({ request: r, action: "APPROVE" });
                                  setAdminNotes("");
                                }}
                              >
                                <CheckCircle size={12} className="inline mr-0.5" />
                                Approve
                              </button>
                              <button
                                type="button"
                                className="admin-btn-ghost text-[10px] px-2 py-1 text-red-400"
                                onClick={() => {
                                  setReviewAction({ request: r, action: "REJECT" });
                                  setAdminNotes("");
                                }}
                              >
                                <XCircle size={12} className="inline mr-0.5" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--admin-muted)]">
                              {r.reviewedBy?.name ?? "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableScroll>

              <AdminMobileList className="lg:hidden">
                {requests.map((r) => (
                  <AdminMobileCard key={r.id}>
                    <div className="flex justify-between mb-2">
                      <Link href={`/admin/users/${r.user.id}`} className="admin-link font-medium">
                        {r.user.name}
                      </Link>
                      <span className={`admin-badge text-[9px] ${r.status === "PENDING" ? "admin-badge-submitted" : r.status === "APPROVED" ? "admin-badge-verified" : "admin-badge-rejected"}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--admin-muted)] mb-1">{r.freeze.reason}</p>
                    {r.userMessage && <p className="text-xs mb-2 italic">&ldquo;{r.userMessage}&rdquo;</p>}
                    <p className="admin-amount text-sm mb-2">{formatCurrency(r.user.totalBalance)}</p>
                    {r.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="admin-btn-primary text-xs flex-1"
                          onClick={() => setReviewAction({ request: r, action: "APPROVE" })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="admin-btn-ghost text-xs flex-1 text-red-400"
                          onClick={() => setReviewAction({ request: r, action: "REJECT" })}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </AdminMobileCard>
                ))}
              </AdminMobileList>
            </>
          )}
          </div>
        </AdminDataCard>
      </AdminFetchState>

      <AdminActionModal
        open={!!reviewAction}
        title={
          reviewAction?.action === "APPROVE"
            ? "Approve Fund Release"
            : "Reject Fund Release"
        }
        description={
          reviewAction
            ? `${reviewAction.action === "APPROVE" ? "Unfreeze" : "Decline release for"} ${reviewAction.request.user.name}'s account (${formatCurrency(reviewAction.request.user.totalBalance)})`
            : undefined
        }
        confirmLabel={reviewAction?.action === "APPROVE" ? "Approve & Unfreeze" : "Reject Request"}
        variant={reviewAction?.action === "REJECT" ? "danger" : "primary"}
        onClose={() => {
          setReviewAction(null);
          setAdminNotes("");
        }}
        onConfirm={submitReview}
        loading={saving}
      >
        <div>
          <label className="text-xs text-[var(--admin-muted)]">Admin notes (optional)</label>
          <textarea
            className="admin-input mt-1 min-h-[72px] w-full"
            placeholder="Internal notes or message context for the customer…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>
        {reviewAction && (
          <div className="rounded-lg border border-[var(--admin-border)] p-3 text-xs space-y-1">
            <p><span className="text-[var(--admin-muted)]">Freeze reason:</span> {reviewAction.request.freeze.reason}</p>
            {reviewAction.request.userMessage && (
              <p><span className="text-[var(--admin-muted)]">User message:</span> {reviewAction.request.userMessage}</p>
            )}
          </div>
        )}
      </AdminActionModal>
    </AdminPage>
  );
}
