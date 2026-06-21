"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Snowflake, Unlock, ExternalLink, History } from "lucide-react";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminToolbar,
  AdminSearchField,
  AdminDataCard,
  AdminTableScroll,
  AdminMobileList,
  AdminMobileCard,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import AdminActionModal from "@/components/admin/AdminActionModal";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface FrozenRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userStatus: string;
  totalBalance: number;
  freezeType: string;
  freezeTypeLabel: string;
  reason: string;
  internalNotes: string | null;
  frozenAt: string;
  frozenBy: { id: string; name: string; email: string };
  pendingReleaseRequest: { id: string; createdAt: string } | null;
}

interface FreezeHistory {
  freezes: {
    id: string;
    freezeTypeLabel: string;
    reason: string;
    status: string;
    frozenAt: string;
    unfrozenAt: string | null;
    frozenBy: { name: string };
    unfrozenBy: { name: string } | null;
  }[];
  auditLogs: {
    id: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: string;
    admin: { name: string } | null;
  }[];
}

export default function AdminFrozenAccountsPage() {
  const searchParams = useSearchParams();
  const highlightUserId = searchParams.get("userId");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editRow, setEditRow] = useState<FrozenRow | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [unfreezeRow, setUnfreezeRow] = useState<FrozenRow | null>(null);
  const [historyUserId, setHistoryUserId] = useState<string | null>(highlightUserId);
  const [history, setHistory] = useState<FreezeHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    const q = params.toString();
    return `/api/admin/account-freezes${q ? `?${q}` : ""}`;
  }, [debouncedSearch]);

  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ freezes: FrozenRow[] }>(url);
  const freezes = data?.freezes ?? [];

  useEffect(() => {
    if (!historyUserId) {
      setHistory(null);
      return;
    }
    setHistoryLoading(true);
    fetch(`/api/admin/users/${historyUserId}/freeze`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setHistory(json))
      .catch(() => setHistory(null))
      .finally(() => setHistoryLoading(false));
  }, [historyUserId]);

  const saveEdit = async () => {
    if (!editRow || !editReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account-freezes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          freezeId: editRow.id,
          reason: editReason.trim(),
          internalNotes: editNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success("Freeze reason updated");
      setEditRow(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmUnfreeze = async () => {
    if (!unfreezeRow) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${unfreezeRow.userId}/unfreeze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unfreeze failed");
      toast.success("Account unfrozen");
      setUnfreezeRow(null);
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
        title="Frozen Accounts"
        description="View, search, and manage all currently frozen customer accounts."
        action={<AdminRefreshButton onClick={refresh} />}
      />

      <AdminToolbar>
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email…"
        />
      </AdminToolbar>

      <AdminFetchState loading={loading} error={error} onRetry={refresh} lastUpdated={lastUpdated}>
        <AdminDataCard>
          <h2 className="font-semibold text-white mb-4 px-4 pt-4 flex items-center gap-2">
            <Snowflake size={18} className="text-amber-400" />
            Active Freezes ({freezes.length})
          </h2>
          <div className="px-4 pb-4">
          {freezes.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)] py-6 text-center">No frozen accounts</p>
          ) : (
            <>
              <AdminTableScroll className="hidden md:block">
                <table className="admin-table w-full">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)]">
                      <th className="text-left py-2">Customer</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Reason</th>
                      <th className="text-right py-2">Balance</th>
                      <th className="text-left py-2">Frozen</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {freezes.map((f) => (
                      <tr
                        key={f.id}
                        className={`border-b border-[var(--admin-border)]/50 ${highlightUserId === f.userId ? "bg-amber-500/5" : ""}`}
                      >
                        <td className="py-3">
                          <Link href={`/admin/users/${f.userId}`} className="admin-link text-sm font-medium">
                            {f.userName}
                          </Link>
                          <p className="text-[10px] text-[var(--admin-muted)]">{f.userEmail}</p>
                          {f.pendingReleaseRequest && (
                            <span className="admin-badge admin-badge-submitted text-[9px] mt-1 inline-block">
                              Release requested
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-xs">{f.freezeTypeLabel}</td>
                        <td className="py-3 text-sm text-[var(--admin-muted)] max-w-[200px] truncate" title={f.reason}>
                          {f.reason}
                        </td>
                        <td className="py-3 text-right admin-amount">{formatCurrency(f.totalBalance)}</td>
                        <td className="py-3 text-xs text-[var(--admin-muted)]">
                          {new Date(f.frozenAt).toLocaleDateString()}
                          <span className="block text-[10px]">by {f.frozenBy.name}</span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <button
                              type="button"
                              className="admin-btn-ghost text-[10px] px-2 py-1"
                              onClick={() => {
                                setEditRow(f);
                                setEditReason(f.reason);
                                setEditNotes(f.internalNotes ?? "");
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-btn-ghost text-[10px] px-2 py-1"
                              onClick={() => setHistoryUserId(f.userId)}
                            >
                              <History size={12} className="inline mr-0.5" />
                              History
                            </button>
                            <button
                              type="button"
                              className="admin-btn-ghost text-[10px] px-2 py-1 text-emerald-400"
                              onClick={() => setUnfreezeRow(f)}
                            >
                              <Unlock size={12} className="inline mr-0.5" />
                              Unfreeze
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableScroll>

              <AdminMobileList className="md:hidden">
                {freezes.map((f) => (
                  <AdminMobileCard key={f.id}>
                    <div className="flex justify-between gap-2 mb-2">
                      <div>
                        <Link href={`/admin/users/${f.userId}`} className="admin-link font-medium">
                          {f.userName}
                        </Link>
                        <p className="text-[10px] text-[var(--admin-muted)]">{f.userEmail}</p>
                      </div>
                      <span className="admin-amount text-sm">{formatCurrency(f.totalBalance)}</span>
                    </div>
                    <p className="text-xs text-[var(--admin-muted)] mb-2">{f.freezeTypeLabel} · {f.reason}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" className="admin-btn-ghost text-xs flex-1" onClick={() => setUnfreezeRow(f)}>
                        Unfreeze
                      </button>
                      <Link href={`/admin/users/${f.userId}`} className="admin-btn-ghost text-xs flex items-center gap-1">
                        Profile <ExternalLink size={12} />
                      </Link>
                    </div>
                  </AdminMobileCard>
                ))}
              </AdminMobileList>
            </>
          )}
          </div>
        </AdminDataCard>
      </AdminFetchState>

      {historyUserId && (
        <div className="admin-card p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <History size={18} /> Freeze History & Audit Logs
            </h2>
            <button type="button" className="admin-btn-ghost text-xs" onClick={() => setHistoryUserId(null)}>
              Close
            </button>
          </div>
          {historyLoading ? (
            <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
          ) : history ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs uppercase text-[var(--admin-muted)] mb-2">Freeze Records</h3>
                <div className="space-y-2">
                  {history.freezes.map((f) => (
                    <div key={f.id} className="p-3 rounded-lg border border-[var(--admin-border)]/50 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-white">{f.freezeTypeLabel}</span>
                        <span className={`admin-badge text-[9px] ${f.status === "ACTIVE" ? "admin-badge-rejected" : "admin-badge-verified"}`}>
                          {f.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--admin-muted)] mt-1">{f.reason}</p>
                      <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                        {new Date(f.frozenAt).toLocaleString()} · {f.frozenBy.name}
                        {f.unfrozenAt && ` → Unfrozen ${new Date(f.unfrozenAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase text-[var(--admin-muted)] mb-2">Audit Log</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {history.auditLogs.map((l) => (
                    <div key={l.id} className="p-3 rounded-lg border border-[var(--admin-border)]/50 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-mono text-amber-300/90">{l.action}</span>
                        <span className="text-[var(--admin-muted)]">{new Date(l.createdAt).toLocaleString()}</span>
                      </div>
                      {l.admin && <p className="text-[var(--admin-muted)] mt-0.5">Admin: {l.admin.name}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">No history found</p>
          )}
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="admin-card max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-white">Edit Freeze — {editRow.userName}</h3>
            <div>
              <label className="text-xs text-[var(--admin-muted)]">Customer-visible reason</label>
              <textarea
                className="admin-input mt-1 min-h-[80px]"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--admin-muted)]">Internal notes</label>
              <textarea
                className="admin-input mt-1 min-h-[60px]"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="admin-btn-ghost flex-1" onClick={() => setEditRow(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="admin-btn-primary flex-1" onClick={saveEdit} disabled={saving}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminActionModal
        open={!!unfreezeRow}
        title="Unfreeze Account"
        description={unfreezeRow ? `Restore full access for ${unfreezeRow.userName}?` : undefined}
        confirmLabel="Unfreeze Account"
        variant="primary"
        onClose={() => setUnfreezeRow(null)}
        onConfirm={confirmUnfreeze}
        loading={saving}
      />
    </AdminPage>
  );
}
