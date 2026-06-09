"use client";

import Link from "next/link";
import { AdminPageHeader, AdminStatCard, AdminKycBadge } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface OverviewData {
  stats: {
    totalUsers: number;
    pendingKyc: number;
    totalTransactions: number;
    totalAccounts: number;
    totalAum: number;
    contactMessages: number;
    pendingDeposits: number;
    totalDepositRequests: number;
    pendingWithdrawals: number;
    totalWithdrawalRequests: number;
    withdrawalCount: number;
    depositTxCount: number;
    auditLogCount: number;
  };
  recentUsers: { id: string; name: string; email: string; kycStatus: string; createdAt: string }[];
  recentTransactions: {
    id: string; type: string; amount: number; description: string; status: string;
    createdAt: string; userName: string; userEmail: string;
  }[];
  pendingKycUsers: { id: string; name: string; email: string; kycStatus: string }[];
  recentDeposits: {
    id: string; userId: string; userName: string; userEmail: string;
    amountUsd: number | null; status: string; txHash: string | null; createdAt: string;
  }[];
  recentAuditLogs: {
    id: string; action: string; createdAt: string;
    admin: { name: string }; targetUser: { id: string; name: string } | null;
  }[];
  usersByKyc: { status: string; count: number }[];
  txByType: { type: string; count: number; volume: number }[];
  depositsByStatus: { status: string; count: number }[];
}

function DbBarChart({
  title,
  items,
  labelKey,
  valueKey,
}: {
  title: string;
  items: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);

  return (
    <div className="admin-card p-5">
      <h2 className="font-semibold text-white mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)] py-4 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={String(item[labelKey])}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--admin-muted)]">{String(item[labelKey])}</span>
                <span className="text-white font-medium">{String(item[valueKey])}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full brand-gradient-bg"
                  style={{ width: `${(Number(item[valueKey]) / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<OverviewData>("/api/admin/overview");

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Live metrics from Supabase — cached ~25s, refreshes every 90s"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh now
          </button>
        }
      />

      <AdminFetchState loading={loading} error={error} onRetry={refresh} lastUpdated={lastUpdated}>
        {data && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <AdminStatCard label="Total Users" value={data.stats.totalUsers.toLocaleString()} />
              <AdminStatCard label="Total AUM" value={formatCurrency(data.stats.totalAum)} />
              <AdminStatCard label="Bank Accounts" value={data.stats.totalAccounts.toLocaleString()} />
              <AdminStatCard label="Transactions" value={data.stats.totalTransactions.toLocaleString()} />
              <AdminStatCard label="Pending Deposits" value={data.stats.pendingDeposits} sub={`${data.stats.totalDepositRequests} total requests`} />
              <AdminStatCard label="Pending Withdrawals" value={data.stats.pendingWithdrawals} sub={`${data.stats.totalWithdrawalRequests} total requests`} />
              <AdminStatCard label="Withdrawals" value={data.stats.withdrawalCount.toLocaleString()} sub="From transaction records" />
              <AdminStatCard label="Pending KYC" value={data.stats.pendingKyc} sub="Requires review" />
              <AdminStatCard label="Support Messages" value={data.stats.contactMessages} />
              <AdminStatCard label="Audit Log Entries" value={data.stats.auditLogCount.toLocaleString()} />
              <AdminStatCard label="Deposit Transactions" value={data.stats.depositTxCount.toLocaleString()} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-8">
              <DbBarChart title="Users by KYC Status" items={data.usersByKyc} labelKey="status" valueKey="count" />
              <DbBarChart title="Transactions by Type" items={data.txByType} labelKey="type" valueKey="count" />
              <DbBarChart title="Deposits by Status" items={data.depositsByStatus} labelKey="status" valueKey="count" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="admin-card admin-card-glow p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">Recent Users</h2>
                  <Link href="/admin/users" className="text-xs admin-link">View all</Link>
                </div>
                <table className="admin-table w-full">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)]">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">KYC</th>
                      <th className="text-right py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsers.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-sm text-[var(--admin-muted)]">No users registered yet</td></tr>
                    ) : data.recentUsers.map((u) => (
                      <tr key={u.id} className="border-b border-[var(--admin-border)]/50">
                        <td className="py-3">
                          <Link href={`/admin/users/${u.id}`} className="text-white admin-link font-medium">{u.name}</Link>
                          <p className="text-[10px] text-[var(--admin-muted)]">{u.email}</p>
                        </td>
                        <td className="py-3"><AdminKycBadge status={u.kycStatus} /></td>
                        <td className="py-3 text-right text-xs text-[var(--admin-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-card admin-card-glow p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">Recent Transactions</h2>
                  <Link href="/admin/transactions" className="text-xs admin-link">View all</Link>
                </div>
                {data.recentTransactions.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)] py-6 text-center">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-[var(--admin-border)]/50 last:border-0">
                        <div>
                          <p className="text-sm text-white">{t.description}</p>
                          <p className="text-[10px] text-[var(--admin-muted)]">{t.userName} · {t.type}</p>
                        </div>
                        <span className="admin-amount text-sm">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="admin-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">Recent Deposits</h2>
                  <Link href="/admin/deposits" className="text-xs admin-link">View all</Link>
                </div>
                {data.recentDeposits.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)] py-6 text-center">No deposit requests yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentDeposits.map((d) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b border-[var(--admin-border)]/50 last:border-0">
                        <div>
                          <Link href={`/admin/users/${d.userId}`} className="text-sm text-white admin-link">{d.userName}</Link>
                          <p className="text-[10px] text-[var(--admin-muted)] font-mono truncate max-w-[200px]">{d.txHash ?? "No hash"}</p>
                        </div>
                        <div className="text-right">
                          <span className={`admin-badge ${d.status === "PENDING" ? "admin-badge-submitted" : d.status === "APPROVED" ? "admin-badge-verified" : "admin-badge-rejected"}`}>{d.status}</span>
                          {d.amountUsd != null && <p className="text-xs admin-amount mt-1">{formatCurrency(d.amountUsd)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">Admin Activity Log</h2>
                  <Link href="/admin/audit-log" className="text-xs admin-link">View all</Link>
                </div>
                {data.recentAuditLogs.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)] py-6 text-center">No admin actions logged yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentAuditLogs.map((log) => (
                      <div key={log.id} className="py-2 border-b border-[var(--admin-border)]/50 last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="admin-badge admin-badge-submitted text-[10px]">{log.action}</span>
                          <span className="text-xs text-[var(--admin-muted)]">by {log.admin.name}</span>
                          {log.targetUser && (
                            <Link href={`/admin/users/${log.targetUser.id}`} className="admin-link text-xs">{log.targetUser.name}</Link>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--admin-muted)] mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {data.pendingKycUsers.length > 0 && (
              <div className="admin-card p-5 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">KYC Queue</h2>
                  <Link href="/admin/kyc" className="text-xs admin-link">Review all</Link>
                </div>
                <div className="flex flex-wrap gap-3">
                  {data.pendingKycUsers.map((u) => (
                    <Link key={u.id} href={`/admin/users/${u.id}`} className="admin-card px-4 py-3 hover:border-accent-brand/30 transition-colors">
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <AdminKycBadge status={u.kycStatus} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </AdminFetchState>
    </div>
  );
}
