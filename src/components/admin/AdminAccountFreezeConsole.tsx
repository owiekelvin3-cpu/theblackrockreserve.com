"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Snowflake,
  Unlock,
  HandCoins,
  CheckCircle,
  XCircle,
  History,
  UserPlus,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Pencil,
  ExternalLink,
} from "lucide-react";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import AdminActionModal from "@/components/admin/AdminActionModal";
import AdminFreezeModal from "@/components/admin/AdminFreezeModal";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { cn, formatCurrency } from "@/lib/utils";

type TabId = "active" | "releases" | "freeze";

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

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  totalBalance: number;
  status: string;
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
    createdAt: string;
    admin: { name: string } | null;
  }[];
}

type ReviewAction = { request: FundReleaseRow; action: "APPROVE" | "REJECT" };

function UserAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/20 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-amber-200">{initial}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success";
  icon: typeof Snowflake;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-white/10 bg-white/[0.02]";
  const iconClass =
    tone === "warning" ? "text-amber-400" : tone === "success" ? "text-emerald-400" : "text-white/70";

  return (
    <div className={cn("admin-card p-4 border", toneClass)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--admin-muted)]">{label}</p>
        <Icon size={16} className={iconClass} />
      </div>
      <p className="text-2xl font-semibold text-white mt-2 tabular-nums">{value}</p>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)] mb-1">{label}</p>
      <div className="text-sm text-white leading-relaxed">{children}</div>
    </div>
  );
}

export default function AdminAccountFreezeConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "active";
  const initialUserId = searchParams.get("userId");

  const [tab, setTab] = useState<TabId>(
    initialTab === "releases" || initialTab === "freeze" ? initialTab : "active"
  );
  const [releaseFilter, setReleaseFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [selectedFreezeId, setSelectedFreezeId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const [editReason, setEditReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [unfreezeRow, setUnfreezeRow] = useState<FrozenRow | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [freezeModalUser, setFreezeModalUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FreezeHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    data: freezeData,
    error: freezeError,
    loading: freezeLoading,
    refresh: refreshFreezes,
    lastUpdated: freezeUpdated,
  } = useAdminFetch<{ freezes: FrozenRow[] }>("/api/admin/account-freezes");

  const {
    data: pendingReleaseData,
    refresh: refreshPendingReleases,
  } = useAdminFetch<{ requests: FundReleaseRow[] }>("/api/admin/fund-release-requests?status=PENDING");

  const releaseUrl =
    releaseFilter === "ALL"
      ? "/api/admin/fund-release-requests"
      : `/api/admin/fund-release-requests?status=${releaseFilter}`;

  const {
    data: releaseData,
    error: releaseError,
    loading: releaseLoading,
    refresh: refreshReleases,
    lastUpdated: releaseUpdated,
  } = useAdminFetch<{ requests: FundReleaseRow[] }>(releaseUrl);

  const {
    data: usersData,
    loading: usersLoading,
    refresh: refreshUsers,
  } = useAdminFetch<{ users: UserRow[] }>("/api/admin/users");

  const freezes = useMemo(() => freezeData?.freezes ?? [], [freezeData?.freezes]);
  const requests = useMemo(() => releaseData?.requests ?? [], [releaseData?.requests]);
  const allUsers = useMemo(() => usersData?.users ?? [], [usersData?.users]);

  const frozenUserIds = useMemo(() => new Set(freezes.map((f) => f.userId)), [freezes]);
  const availableToFreeze = useMemo(
    () => allUsers.filter((u) => u.status === "ACTIVE" && !frozenUserIds.has(u.id)),
    [allUsers, frozenUserIds]
  );

  const pendingCount = pendingReleaseData?.requests?.length ?? 0;

  const selectedFreeze = useMemo(
    () => freezes.find((f) => f.id === selectedFreezeId) ?? null,
    [freezes, selectedFreezeId]
  );

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const refreshAll = useCallback(() => {
    refreshFreezes();
    refreshReleases();
    refreshPendingReleases();
    refreshUsers();
  }, [refreshFreezes, refreshReleases, refreshPendingReleases, refreshUsers]);

  useEffect(() => {
    if (initialUserId && freezes.length) {
      const match = freezes.find((f) => f.userId === initialUserId);
      if (match) {
        setTab("active");
        setSelectedFreezeId(match.id);
      }
    }
  }, [initialUserId, freezes]);

  useEffect(() => {
    if (tab === "active" && freezes.length && !selectedFreezeId) {
      setSelectedFreezeId(freezes[0].id);
    }
  }, [tab, freezes, selectedFreezeId]);

  useEffect(() => {
    if (tab === "releases" && requests.length && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    }
  }, [tab, requests, selectedRequestId]);

  const loadHistory = useCallback(async (userId: string) => {
    setHistoryLoading(true);
    setShowHistory(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/freeze`, { credentials: "include" });
      const json = await res.json();
      setHistory(res.ok ? json : null);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const saveEdit = async () => {
    if (!selectedFreeze || !editReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account-freezes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          freezeId: selectedFreeze.id,
          reason: editReason.trim(),
          internalNotes: editNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success("Freeze reason updated");
      setEditOpen(false);
      refreshAll();
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
      setSelectedFreezeId(null);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

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
      setSelectedRequestId(null);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (next: TabId) => {
    setTab(next);
    setShowHistory(false);
    router.replace(`/admin/frozen-accounts?tab=${next}`, { scroll: false });
  };

  const loading = freezeLoading || (tab === "releases" && releaseLoading);
  const error = freezeError || (tab === "releases" ? releaseError : null);

  const tabs: { id: TabId; label: string; count?: number; icon: typeof Snowflake }[] = [
    { id: "active", label: "Active Freezes", count: freezes.length, icon: Snowflake },
    { id: "releases", label: "Release Queue", count: pendingCount, icon: HandCoins },
    { id: "freeze", label: "Freeze Account", count: availableToFreeze.length, icon: UserPlus },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        title="Account Controls"
        description="Review restrictions, process release requests, and apply account holds."
        action={<AdminRefreshButton onClick={refreshAll} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Active freezes" value={freezes.length} icon={Snowflake} tone="warning" />
        <StatCard label="Pending releases" value={pendingCount} icon={HandCoins} tone={pendingCount > 0 ? "warning" : "default"} />
        <StatCard label="Available to freeze" value={availableToFreeze.length} icon={UserPlus} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6 p-1 rounded-xl bg-white/[0.03] border border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-[var(--admin-muted)] hover:text-white hover:bg-white/5"
            )}
          >
            <t.icon size={16} />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  "min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center",
                  tab === t.id ? "bg-amber-500 text-white" : "bg-amber-500/20 text-amber-300"
                )}
              >
                {t.count > 99 ? "99+" : t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "freeze" ? (
        <AdminFetchState loading={usersLoading} error={null} onRetry={refreshUsers}>
          <div className="admin-card p-5">
            <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
              <UserPlus size={18} className="text-amber-400" />
              Select a customer to freeze
            </h2>
            <p className="text-sm text-[var(--admin-muted)] mb-5">
              Browse active accounts below — click any customer to open the freeze form. No search required.
            </p>
            {availableToFreeze.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)] py-8 text-center">
                All active customers are already frozen, or no users are registered.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {availableToFreeze.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setFreezeModalUser(u)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-[var(--admin-border)] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left group"
                  >
                    <UserAvatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-[var(--admin-muted)] truncate">{u.email}</p>
                      <p className="text-xs admin-amount mt-1">{formatCurrency(u.totalBalance)}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-[var(--admin-muted)] group-hover:text-amber-400 shrink-0 transition-colors"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </AdminFetchState>
      ) : (
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refreshAll}
          lastUpdated={tab === "active" ? freezeUpdated : releaseUpdated}
        >
          <div className="grid lg:grid-cols-[minmax(280px,340px)_1fr] gap-4 min-h-[480px]">
            {/* List panel */}
            <div className="admin-card flex flex-col overflow-hidden">
              {tab === "releases" && (
                <div className="flex gap-1 p-3 border-b border-[var(--admin-border)] flex-wrap">
                  {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setReleaseFilter(f);
                        setSelectedRequestId(null);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide transition-colors",
                        releaseFilter === f
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                          : "text-[var(--admin-muted)] hover:text-white"
                      )}
                    >
                      {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {tab === "active" &&
                  (freezes.length === 0 ? (
                    <p className="text-sm text-[var(--admin-muted)] p-6 text-center">No frozen accounts</p>
                  ) : (
                    freezes.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFreezeId(f.id);
                          setShowHistory(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border",
                          selectedFreezeId === f.id
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-transparent hover:bg-white/[0.04]"
                        )}
                      >
                        <UserAvatar name={f.userName} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{f.userName}</p>
                          <p className="text-[10px] text-[var(--admin-muted)] truncate">{f.userEmail}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] admin-amount">{formatCurrency(f.totalBalance)}</span>
                            {f.pendingReleaseRequest && (
                              <span className="admin-badge admin-badge-submitted text-[9px]">Release pending</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ))}

                {tab === "releases" &&
                  (requests.length === 0 ? (
                    <p className="text-sm text-[var(--admin-muted)] p-6 text-center">No requests in this queue</p>
                  ) : (
                    requests.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRequestId(r.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border",
                          selectedRequestId === r.id
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-transparent hover:bg-white/[0.04]"
                        )}
                      >
                        <UserAvatar name={r.user.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{r.user.name}</p>
                          <p className="text-[10px] text-[var(--admin-muted)] truncate">{r.user.email}</p>
                          <span
                            className={cn(
                              "admin-badge text-[9px] mt-1 inline-block",
                              r.status === "APPROVED"
                                ? "admin-badge-verified"
                                : r.status === "REJECTED"
                                  ? "admin-badge-rejected"
                                  : "admin-badge-submitted"
                            )}
                          >
                            {r.status}
                          </span>
                        </div>
                      </button>
                    ))
                  ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="admin-card admin-card-glow p-5 lg:p-6 flex flex-col">
              {tab === "active" && selectedFreeze ? (
                <>
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={selectedFreeze.userName} />
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-white truncate">{selectedFreeze.userName}</h2>
                        <p className="text-sm text-[var(--admin-muted)] truncate">{selectedFreeze.userEmail}</p>
                        {selectedFreeze.userPhone && (
                          <p className="text-xs text-[var(--admin-muted)]">{selectedFreeze.userPhone}</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/admin/users/${selectedFreeze.userId}`}
                      className="admin-btn-ghost text-xs shrink-0 flex items-center gap-1"
                    >
                      Profile <ExternalLink size={12} />
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="admin-badge admin-badge-rejected text-[10px] flex items-center gap-1">
                      <Snowflake size={10} /> Frozen
                    </span>
                    <span className="admin-badge admin-badge-submitted text-[10px]">{selectedFreeze.freezeTypeLabel}</span>
                    {selectedFreeze.pendingReleaseRequest && (
                      <span className="admin-badge admin-badge-submitted text-[10px]">Release requested</span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <DetailField label="Balance">{formatCurrency(selectedFreeze.totalBalance)}</DetailField>
                    <DetailField label="Frozen on">
                      {new Date(selectedFreeze.frozenAt).toLocaleString()}
                    </DetailField>
                    <DetailField label="Frozen by">{selectedFreeze.frozenBy.name}</DetailField>
                    <DetailField label="Account status">{selectedFreeze.userStatus}</DetailField>
                    <DetailField label="Customer reason">
                      <span className="text-amber-100/90">{selectedFreeze.reason}</span>
                    </DetailField>
                    {selectedFreeze.internalNotes && (
                      <DetailField label="Internal notes">
                        <span className="text-[var(--admin-muted)]">{selectedFreeze.internalNotes}</span>
                      </DetailField>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-[var(--admin-border)]">
                    <button
                      type="button"
                      className="admin-btn-primary text-xs flex items-center gap-1.5"
                      onClick={() => setUnfreezeRow(selectedFreeze)}
                    >
                      <Unlock size={14} /> Unfreeze
                    </button>
                    <button
                      type="button"
                      className="admin-btn-ghost text-xs flex items-center gap-1.5"
                      onClick={() => {
                        setEditReason(selectedFreeze.reason);
                        setEditNotes(selectedFreeze.internalNotes ?? "");
                        setEditOpen(true);
                      }}
                    >
                      <Pencil size={14} /> Edit reason
                    </button>
                    <button
                      type="button"
                      className="admin-btn-ghost text-xs flex items-center gap-1.5"
                      onClick={() => loadHistory(selectedFreeze.userId)}
                    >
                      <History size={14} /> History
                    </button>
                    {selectedFreeze.pendingReleaseRequest && (
                      <button
                        type="button"
                        className="admin-btn-ghost text-xs flex items-center gap-1.5 text-emerald-400"
                        onClick={() => switchTab("releases")}
                      >
                        <HandCoins size={14} /> View release request
                      </button>
                    )}
                  </div>

                  {showHistory && (
                    <div className="mt-6 pt-6 border-t border-[var(--admin-border)]">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <History size={16} /> Audit trail
                      </h3>
                      {historyLoading ? (
                        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
                      ) : history ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {history.auditLogs.slice(0, 8).map((l) => (
                            <div
                              key={l.id}
                              className="flex justify-between gap-2 text-xs p-2 rounded-lg bg-white/[0.02] border border-[var(--admin-border)]/50"
                            >
                              <span className="font-mono text-amber-300/90">{l.action}</span>
                              <span className="text-[var(--admin-muted)] shrink-0">
                                {new Date(l.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--admin-muted)]">No history</p>
                      )}
                    </div>
                  )}
                </>
              ) : tab === "releases" && selectedRequest ? (
                <>
                  <div className="flex items-start gap-3 mb-6">
                    <UserAvatar name={selectedRequest.user.name} />
                    <div>
                      <h2 className="text-lg font-semibold text-white">{selectedRequest.user.name}</h2>
                      <p className="text-sm text-[var(--admin-muted)]">{selectedRequest.user.email}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase text-amber-400/80 font-medium">Freeze reason</p>
                        <p className="text-sm text-white mt-1">{selectedRequest.freeze.reason}</p>
                      </div>
                    </div>
                  </div>

                  {selectedRequest.userMessage && (
                    <div className="rounded-xl border border-[var(--admin-border)] p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} className="text-[var(--admin-muted)] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase text-[var(--admin-muted)] font-medium">Customer message</p>
                          <p className="text-sm text-white mt-1 italic">&ldquo;{selectedRequest.userMessage}&rdquo;</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <DetailField label="Balance">{formatCurrency(selectedRequest.user.totalBalance)}</DetailField>
                    <DetailField label="Requested">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </DetailField>
                    <DetailField label="Freeze type">{selectedRequest.freeze.freezeTypeLabel}</DetailField>
                    <DetailField label="Status">
                      <span
                        className={cn(
                          "admin-badge text-[10px]",
                          selectedRequest.status === "APPROVED"
                            ? "admin-badge-verified"
                            : selectedRequest.status === "REJECTED"
                              ? "admin-badge-rejected"
                              : "admin-badge-submitted"
                        )}
                      >
                        {selectedRequest.status}
                      </span>
                    </DetailField>
                  </div>

                  {selectedRequest.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-[var(--admin-border)]">
                      <button
                        type="button"
                        className="admin-btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50"
                        onClick={() => {
                          setReviewAction({ request: selectedRequest, action: "APPROVE" });
                          setAdminNotes("");
                        }}
                      >
                        <CheckCircle size={14} /> Approve & unfreeze
                      </button>
                      <button
                        type="button"
                        className="admin-btn-ghost text-xs flex items-center gap-1.5 text-red-400 border-red-500/30"
                        onClick={() => {
                          setReviewAction({ request: selectedRequest, action: "REJECT" });
                          setAdminNotes("");
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <Link
                        href={`/admin/users/${selectedRequest.user.id}`}
                        className="admin-btn-ghost text-xs flex items-center gap-1"
                      >
                        View profile <ExternalLink size={12} />
                      </Link>
                    </div>
                  ) : (
                    <DetailField label="Reviewed by">
                      {selectedRequest.reviewedBy?.name ?? "—"}
                      {selectedRequest.reviewedAt && (
                        <span className="block text-xs text-[var(--admin-muted)] mt-0.5">
                          {new Date(selectedRequest.reviewedAt).toLocaleString()}
                        </span>
                      )}
                    </DetailField>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <Snowflake size={40} className="text-[var(--admin-muted)] mb-3 opacity-40" />
                  <p className="text-sm text-[var(--admin-muted)]">
                    {tab === "active"
                      ? "Select a frozen account from the list"
                      : "Select a release request from the queue"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </AdminFetchState>
      )}

      {editOpen && selectedFreeze && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="admin-card max-w-md w-full p-6 space-y-4">
            <h3 className="font-semibold text-white">Edit freeze — {selectedFreeze.userName}</h3>
            <div>
              <label className="text-xs text-[var(--admin-muted)]">Customer-visible reason</label>
              <textarea
                className="admin-input mt-1 min-h-[88px] w-full"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--admin-muted)]">Internal notes</label>
              <textarea
                className="admin-input mt-1 min-h-[72px] w-full"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="admin-btn-ghost flex-1" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="admin-btn-primary flex-1" onClick={saveEdit} disabled={saving}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminActionModal
        open={!!unfreezeRow}
        title="Unfreeze account"
        description={unfreezeRow ? `Restore full access for ${unfreezeRow.userName}?` : undefined}
        confirmLabel="Unfreeze account"
        variant="primary"
        onClose={() => setUnfreezeRow(null)}
        onConfirm={confirmUnfreeze}
        loading={saving}
      />

      <AdminActionModal
        open={!!reviewAction}
        title={reviewAction?.action === "APPROVE" ? "Approve fund release" : "Reject fund release"}
        description={
          reviewAction
            ? `${reviewAction.action === "APPROVE" ? "Unfreeze" : "Decline release for"} ${reviewAction.request.user.name} (${formatCurrency(reviewAction.request.user.totalBalance)})`
            : undefined
        }
        confirmLabel={reviewAction?.action === "APPROVE" ? "Approve & unfreeze" : "Reject request"}
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
            placeholder="Notes for internal records or customer communication…"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>
      </AdminActionModal>

      {freezeModalUser && (
        <AdminFreezeModal
          open={!!freezeModalUser}
          userName={freezeModalUser.name}
          userId={freezeModalUser.id}
          onClose={() => setFreezeModalUser(null)}
          onSuccess={() => {
            setFreezeModalUser(null);
            refreshAll();
            switchTab("active");
          }}
        />
      )}
    </AdminPage>
  );
}
