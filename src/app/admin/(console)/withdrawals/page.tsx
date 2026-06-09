"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUi";
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
  destination: string;
  destinationExtra: string | null;
  note: string | null;
  status: string;
  createdAt: string;
}

export default function AdminWithdrawalsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ withdrawals: WithdrawalRow[] }>(
    "/api/admin/withdrawals"
  );
  const withdrawals = data?.withdrawals ?? [];
  const [reviewing, setReviewing] = useState<string | null>(null);

  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewing(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      toast.success(`Withdrawal ${status.toLowerCase()}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Withdrawal Requests"
        description="Live withdrawal requests across all payout methods — auto-refreshes every 30s"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <div className="admin-card overflow-hidden">
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && withdrawals.length === 0}
          emptyMessage="No withdrawal requests in the database"
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">User</th>
                  <th className="text-left py-3 px-5">Method</th>
                  <th className="text-left py-3 px-5">Account</th>
                  <th className="text-left py-3 px-5">Amount</th>
                  <th className="text-left py-3 px-5">Destination</th>
                  <th className="text-left py-3 px-5">Status</th>
                  <th className="text-left py-3 px-5">Date</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-[var(--admin-border)]/50">
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${w.userId}`} className="admin-link text-sm">
                        {w.userName}
                      </Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{w.userEmail}</p>
                    </td>
                    <td className="py-3 px-5 text-sm">{w.methodLabel}</td>
                    <td className="py-3 px-5 text-sm">
                      {w.accountName}
                      {w.accountBalance != null && (
                        <p className="text-[10px] text-[var(--admin-muted)]">{formatCurrency(w.accountBalance)} bal.</p>
                      )}
                    </td>
                    <td className="py-3 px-5 text-sm font-medium">{formatCurrency(w.amountUsd)}</td>
                    <td className="py-3 px-5 text-xs max-w-[180px]">
                      <p className="truncate font-mono" title={w.destination}>
                        {w.destination}
                      </p>
                      {w.destinationExtra && (
                        <p className="truncate text-[var(--admin-muted)]" title={w.destinationExtra}>
                          {w.destinationExtra}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`admin-badge ${
                          w.status === "PENDING"
                            ? "admin-badge-submitted"
                            : w.status === "APPROVED"
                              ? "admin-badge-verified"
                              : "admin-badge-rejected"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {w.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() => review(w.id, "APPROVED")}
                            disabled={reviewing === w.id}
                            className="admin-btn-primary text-xs py-1 px-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => review(w.id, "REJECTED")}
                            disabled={reviewing === w.id}
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
          </div>
        </AdminFetchState>
      </div>
    </div>
  );
}
