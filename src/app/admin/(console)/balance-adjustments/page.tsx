"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import AdminBalanceAdjustForm from "@/components/admin/AdminBalanceAdjustForm";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface Adjustment {
  id: string;
  type: string;
  amount: number;
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  admin: { name: string; email: string };
  account: { name: string; currency: string };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface UserDetail {
  accounts: { id: string; name: string; currency: string; balance: number }[];
}

export default function AdminBalanceAdjustmentsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ adjustments: Adjustment[] }>(
    "/api/admin/balance-adjustments?limit=100"
  );
  const { data: usersData } = useAdminFetch<{ users: UserOption[] }>("/api/admin/users");
  const adjustments = data?.adjustments ?? [];
  const users = useMemo(() => usersData?.users ?? [], [usersData?.users]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [userAccounts, setUserAccounts] = useState<UserDetail["accounts"]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!selectedUserId) {
      setUserAccounts([]);
      return;
    }

    let cancelled = false;
    setLoadingAccounts(true);
    fetch(`/api/admin/users/${selectedUserId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((json: UserDetail) => {
        if (!cancelled) setUserAccounts(json.accounts ?? []);
      })
      .catch(() => {
        if (!cancelled) setUserAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Balance Adjustments"
        description="Add or remove customer funds and review adjustment history"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <div className="admin-card admin-card-glow p-5">
        <h2 className="font-semibold text-white mb-1">Adjust Customer Balance</h2>
        <p className="text-xs text-[var(--admin-muted)] mb-4">Select a user, then add or remove funds from their account.</p>
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-[var(--admin-muted)] mb-1.5">Customer</label>
            <select
              className="admin-input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
            {selectedUser && (
              <p className="text-xs text-[var(--admin-muted)] mt-2">
                <Link href={`/admin/users/${selectedUser.id}`} className="admin-link">
                  Open full profile & credentials
                </Link>
              </p>
            )}
          </div>
          <div>
            {loadingAccounts ? (
              <p className="text-sm text-[var(--admin-muted)]">Loading accounts...</p>
            ) : selectedUserId ? (
              <AdminBalanceAdjustForm
                userId={selectedUserId}
                accounts={userAccounts}
                onSuccess={() => {
                  refresh();
                  fetch(`/api/admin/users/${selectedUserId}`, { credentials: "include" })
                    .then((res) => res.json())
                    .then((json: UserDetail) => setUserAccounts(json.accounts ?? []));
                }}
                compact
              />
            ) : (
              <p className="text-sm text-[var(--admin-muted)]">Choose a user to adjust their balance.</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && adjustments.length === 0}
          emptyMessage="No balance adjustments in the database"
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">User</th>
                  <th className="text-left py-3 px-5">Type</th>
                  <th className="text-right py-3 px-5">Amount</th>
                  <th className="text-left py-3 px-5">Reason</th>
                  <th className="text-left py-3 px-5">Admin</th>
                  <th className="text-right py-3 px-5">Before → After</th>
                  <th className="text-right py-3 px-5">Date</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02]">
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${a.user.id}`} className="admin-link text-sm">{a.user.name}</Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{a.user.email}</p>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`admin-badge ${a.type === "CREDIT" ? "admin-badge-verified" : "admin-badge-rejected"}`}>{a.type}</span>
                    </td>
                    <td className="py-3 px-5 text-right admin-amount">{formatCurrency(a.amount, a.account.currency)}</td>
                    <td className="py-3 px-5 text-sm text-[var(--admin-muted)] max-w-[200px]">{a.reason}</td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">{a.admin.name}</td>
                    <td className="py-3 px-5 text-right text-xs font-mono text-[var(--admin-muted)]">
                      {formatCurrency(a.balanceBefore)} → {formatCurrency(a.balanceAfter)}
                    </td>
                    <td className="py-3 px-5 text-right text-xs text-[var(--admin-muted)]">
                      {new Date(a.createdAt).toLocaleString()}
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
