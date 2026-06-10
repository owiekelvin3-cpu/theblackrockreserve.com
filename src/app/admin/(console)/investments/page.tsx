"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface InvestmentRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  symbol: string;
  assetName: string;
  amountUsd: number;
  shares: number;
  fee: number;
  totalCost: number;
  status: string;
  createdAt: string;
}

interface InvestmentsData {
  orders: InvestmentRow[];
  stats: { totalOrders: number; totalVolume: number; totalCost: number };
}

export default function AdminInvestmentsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<InvestmentsData>("/api/admin/investments");
  const orders = data?.orders ?? [];
  const stats = data?.stats;

  return (
    <div>
      <AdminPageHeader
        title="Platform Investments"
        description="Monitor all user investment activity and total platform investment volume"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      {stats && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="admin-card p-4">
            <p className="text-xs text-[var(--admin-muted)] uppercase tracking-wide">Total Orders</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalOrders}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-[var(--admin-muted)] uppercase tracking-wide">Investment Volume</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{formatCurrency(stats.totalVolume)}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-[var(--admin-muted)] uppercase tracking-wide">Total Cost (incl. fees)</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{formatCurrency(stats.totalCost)}</p>
          </div>
        </div>
      )}

      <AdminFetchState loading={loading} error={error} isEmpty={!loading && orders.length === 0} onRetry={refresh} lastUpdated={lastUpdated}>
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[800px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>Shares</th>
                  <th>Fee</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="text-[var(--admin-muted)] text-sm whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <Link href={`/admin/users/${o.userId}`} className="text-accent-brand hover:underline">
                        {o.userName}
                      </Link>
                      <p className="text-xs text-[var(--admin-muted)]">{o.userEmail}</p>
                    </td>
                    <td>
                      <span className="font-mono font-semibold">{o.symbol}</span>
                      <p className="text-xs text-[var(--admin-muted)]">{o.assetName}</p>
                    </td>
                    <td className="font-mono">{formatCurrency(o.amountUsd)}</td>
                    <td className="font-mono text-sm">{o.shares.toFixed(4)}</td>
                    <td className="font-mono text-[var(--admin-muted)]">{formatCurrency(o.fee)}</td>
                    <td className="font-mono font-semibold">{formatCurrency(o.totalCost)}</td>
                    <td>
                      <span className="admin-pill">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminFetchState>
    </div>
  );
}
