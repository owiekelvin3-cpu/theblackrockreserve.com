"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface TxRow {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  accountName: string;
  currency: string;
}

export default function AdminTransactionsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ transactions: TxRow[] }>("/api/admin/transactions");
  const transactions = data?.transactions ?? [];
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (id: string, status: "COMPLETED" | "FAILED") => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(`Transaction marked ${status.toLowerCase()}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Transactions"
        description="All platform transactions from Supabase — auto-refreshes every 30s"
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
          isEmpty={!loading && !error && transactions.length === 0}
          emptyMessage="No transactions in the database"
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">Description</th>
                  <th className="text-left py-3 px-5">User</th>
                  <th className="text-left py-3 px-5">Type</th>
                  <th className="text-left py-3 px-5">Status</th>
                  <th className="text-right py-3 px-5">Amount</th>
                  <th className="text-right py-3 px-5">Date</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02]">
                    <td className="py-3 px-5 text-sm text-white">{t.description}</td>
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${t.userId}`} className="admin-link">{t.userName}</Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{t.userEmail}</p>
                    </td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">{t.type}</td>
                    <td className="py-3 px-5">
                      <span className={`admin-badge ${
                        t.status === "COMPLETED" ? "admin-badge-verified"
                          : t.status === "PENDING" ? "admin-badge-submitted"
                          : "admin-badge-rejected"
                      }`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-5 text-right admin-amount text-sm">
                      {formatCurrency(t.amount, t.currency)}
                    </td>
                    <td className="py-3 px-5 text-right text-xs text-[var(--admin-muted)]">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {t.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(t.id, "COMPLETED")}
                            disabled={updating === t.id}
                            className="admin-btn-primary text-xs py-1 px-2"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(t.id, "FAILED")}
                            disabled={updating === t.id}
                            className="admin-btn-ghost text-xs text-red-400 py-1 px-2"
                          >
                            Fail
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
