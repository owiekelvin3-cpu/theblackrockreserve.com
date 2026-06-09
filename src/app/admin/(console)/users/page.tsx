"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHeader, AdminKycBadge, AdminStatusBadge } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  kycStatus: string;
  accountType: string;
  emailVerified: boolean;
  totalBalance: number;
  accountsCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (kycFilter) params.set("kycStatus", kycFilter);
    const q = params.toString();
    return `/api/admin/users${q ? `?${q}` : ""}`;
  }, [debouncedSearch, statusFilter, kycFilter]);

  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ users: UserRow[] }>(url);
  const users = data?.users ?? [];

  return (
    <div>
      <AdminPageHeader
        title="User Management"
        description="All registered users — view credentials, balances, and manage funds"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]" />
          <input
            type="search"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input w-auto min-w-[140px]">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <select value={kycFilter} onChange={(e) => setKycFilter(e.target.value)} className="admin-input w-auto min-w-[140px]">
          <option value="">All KYC</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="admin-card overflow-hidden">
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && users.length === 0}
          emptyMessage="No users match your filters"
        >
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-white/[0.02]">
                  <th className="text-left py-3 px-5">User</th>
                  <th className="text-left py-3 px-5">Phone</th>
                  <th className="text-left py-3 px-5">Status</th>
                  <th className="text-left py-3 px-5">KYC</th>
                  <th className="text-left py-3 px-5">Email</th>
                  <th className="text-right py-3 px-5">Balance</th>
                  <th className="text-right py-3 px-5">Joined</th>
                  <th className="text-right py-3 px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02]">
                    <td className="py-3 px-5">
                      <p className="text-white font-medium text-sm">{u.name}</p>
                      <p className="text-[10px] text-[var(--admin-muted)]">{u.email}</p>
                      <p className="text-[10px] text-[var(--admin-muted)]">{u.accountType}</p>
                    </td>
                    <td className="py-3 px-5 text-xs text-[var(--admin-muted)]">{u.phone ?? "—"}</td>
                    <td className="py-3 px-5"><AdminStatusBadge status={u.status} /></td>
                    <td className="py-3 px-5"><AdminKycBadge status={u.kycStatus} /></td>
                    <td className="py-3 px-5">
                      <span className={`admin-badge text-[10px] ${u.emailVerified ? "admin-badge-verified" : "admin-badge-submitted"}`}>
                        {u.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right admin-amount text-sm">{formatCurrency(u.totalBalance)}</td>
                    <td className="py-3 px-5 text-right text-xs text-[var(--admin-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-5 text-right">
                      <Link href={`/admin/users/${u.id}`} className="admin-btn-primary text-xs py-1.5 px-3 inline-block">
                        Manage
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
