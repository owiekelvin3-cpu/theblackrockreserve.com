"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminToolbar,
  AdminSearchField,
  AdminSelectFilter,
  AdminDataCard,
  AdminTableScroll,
  AdminMobileList,
  AdminMobileCard,
  AdminKycBadge,
  AdminStatusBadge,
} from "@/components/admin/AdminUi";
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
  location: string | null;
  lastLoginIp: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

function LocationCell({ location, ip }: { location: string | null; ip: string | null }) {
  if (!location && !ip) return <span className="text-[var(--admin-muted)]">—</span>;
  return (
    <div className="min-w-0">
      {location && (
        <p className="text-xs flex items-center gap-1">
          <MapPin size={12} className="text-accent-brand shrink-0" />
          <span className="truncate">{location}</span>
        </p>
      )}
      {ip && <p className="text-[10px] text-[var(--admin-muted)] font-mono truncate">{ip}</p>}
    </div>
  );
}

function UserBadges({ u }: { u: UserRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      <AdminStatusBadge status={u.status} />
      <AdminKycBadge status={u.kycStatus} />
      <span className={`admin-badge text-[10px] ${u.emailVerified ? "admin-badge-verified" : "admin-badge-submitted"}`}>
        {u.emailVerified ? "Verified" : "Unverified"}
      </span>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersPageContent />
    </Suspense>
  );
}

function AdminUsersPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [kycFilter, setKycFilter] = useState("");

  useEffect(() => {
    const fromUrl = searchParams.get("search") ?? "";
    setSearch(fromUrl);
    setDebouncedSearch(fromUrl);
  }, [searchParams]);

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
    <AdminPage>
      <AdminPageHeader
        title="User Management"
        description="Registered customers — credentials, location, balances, and fund controls"
        action={<AdminRefreshButton onClick={refresh} />}
      />

      <AdminToolbar>
        <AdminSearchField value={search} onChange={setSearch} placeholder="Search name or email..." />
        <AdminSelectFilter value={statusFilter} onChange={setStatusFilter}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </AdminSelectFilter>
        <AdminSelectFilter value={kycFilter} onChange={setKycFilter}>
          <option value="">All KYC</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </AdminSelectFilter>
      </AdminToolbar>

      <AdminDataCard noPadding>
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && users.length === 0}
          emptyMessage="No users match your filters"
        >
          <AdminMobileList>
            {users.map((u) => (
              <AdminMobileCard key={u.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-[10px] text-[var(--admin-muted)] truncate">{u.email}</p>
                  </div>
                  <Link href={`/admin/users/${u.id}`} className="admin-btn-primary text-xs py-1.5 px-3 shrink-0">
                    Manage
                  </Link>
                </div>
                <UserBadges u={u} />
                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                  <div>
                    <p className="text-[var(--admin-muted)]">Balance</p>
                    <p className="admin-amount">{formatCurrency(u.totalBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--admin-muted)]">Joined</p>
                    <p>{new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--admin-muted)] mb-0.5">Location</p>
                    <LocationCell location={u.location} ip={u.lastLoginIp} />
                  </div>
                </div>
              </AdminMobileCard>
            ))}
          </AdminMobileList>

          <AdminTableScroll className="admin-desktop-table">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th className="text-left">User</th>
                  <th className="text-left">Location</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">KYC</th>
                  <th className="text-left">Email</th>
                  <th className="text-right">Balance</th>
                  <th className="text-right">Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-[10px] text-[var(--admin-muted)]">{u.email}</p>
                      <p className="text-[10px] text-[var(--admin-muted)]">{u.accountType}</p>
                    </td>
                    <td className="max-w-[180px]">
                      <LocationCell location={u.location} ip={u.lastLoginIp} />
                    </td>
                    <td className="text-xs text-[var(--admin-muted)]">{u.phone ?? "—"}</td>
                    <td><AdminStatusBadge status={u.status} /></td>
                    <td><AdminKycBadge status={u.kycStatus} /></td>
                    <td>
                      <span className={`admin-badge text-[10px] ${u.emailVerified ? "admin-badge-verified" : "admin-badge-submitted"}`}>
                        {u.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="text-right admin-amount text-sm">{formatCurrency(u.totalBalance)}</td>
                    <td className="text-right text-xs text-[var(--admin-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <Link href={`/admin/users/${u.id}`} className="admin-btn-primary text-xs py-1.5 px-3 inline-block">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        </AdminFetchState>
      </AdminDataCard>
    </AdminPage>
  );
}
