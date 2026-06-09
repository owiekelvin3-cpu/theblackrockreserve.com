"use client";

import Link from "next/link";
import { AdminPageHeader, AdminKycBadge } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface AccountRow {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  userId: string;
  userName: string;
  userEmail: string;
  userKyc: string;
  createdAt: string;
}

export default function AdminAccountsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ accounts: AccountRow[] }>("/api/admin/accounts");
  const accounts = data?.accounts ?? [];
  const totalAum = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <AdminPageHeader
        title="Bank Accounts"
        description={`${accounts.length} accounts · ${formatCurrency(totalAum)} total balance — adjust funds from each user profile`}
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
          isEmpty={!loading && !error && accounts.length === 0}
          emptyMessage="No bank accounts in the database"
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">Account</th>
                  <th className="text-left py-3 px-5">Owner</th>
                  <th className="text-left py-3 px-5">Type</th>
                  <th className="text-left py-3 px-5">KYC</th>
                  <th className="text-right py-3 px-5">Balance</th>
                  <th className="text-right py-3 px-5">Opened</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02]">
                    <td className="py-3 px-5 text-sm text-white">{a.name}</td>
                    <td className="py-3 px-5">
                      <Link href={`/admin/users/${a.userId}`} className="admin-link">{a.userName}</Link>
                      <p className="text-[10px] text-[var(--admin-muted)]">{a.userEmail}</p>
                    </td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">{a.type}</td>
                    <td className="py-3 px-5"><AdminKycBadge status={a.userKyc} /></td>
                    <td className="py-3 px-5 text-right admin-amount text-sm">
                      {formatCurrency(a.balance, a.currency)}
                    </td>
                    <td className="py-3 px-5 text-right text-xs text-[var(--admin-muted)]">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link href={`/admin/users/${a.userId}`} className="admin-btn-primary text-xs py-1.5 px-3 inline-block">
                        Adjust Balance
                      </Link>
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
