"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  FileText,
  History,
  Mail,
  Megaphone,
  RefreshCw,
  Send,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Save,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  AdminDataCard,
  AdminFormPanel,
  AdminModal,
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminSearchField,
  AdminTableScroll,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import AdminRichTextEditor, { EmailPreviewFrame } from "@/components/admin/AdminRichTextEditor";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { cn } from "@/lib/utils";

type Tab = "dashboard" | "compose" | "broadcast" | "templates" | "logs";

type OverviewData = {
  stats: {
    totalEmails: number;
    emailsToday: number;
    successful: number;
    failed: number;
    pending: number;
  };
  recentActivity: Array<{
    id: string;
    to: string;
    subject: string;
    status: string;
    sendType: string;
    failureReason: string | null;
    createdAt: string;
    sentBy: { name: string; email: string } | null;
  }>;
  smtpConfigured: boolean;
  permissions: { canSendIndividual: boolean; canSendBroadcast: boolean; isSuperAdmin: boolean };
};

type UserRow = { id: string; name: string; email: string; status: string };
type TemplateRow = {
  id: string;
  name: string;
  slug: string;
  subject: string;
  htmlBody: string;
  isDefault: boolean;
};

type LogRow = {
  id: string;
  to: string;
  subject: string;
  status: string;
  sendType: string;
  failureReason: string | null;
  createdAt: string;
  sentAt: string | null;
  sentBy: { name: string; email: string } | null;
  recipient: { name: string; email: string } | null;
};

const BROADCAST_FILTERS = [
  { value: "ALL", label: "All users" },
  { value: "ACTIVE", label: "Active users" },
  { value: "VERIFIED", label: "Verified email users" },
  { value: "WITH_INVESTMENTS", label: "Users with investments" },
  { value: "PENDING_KYC", label: "Pending KYC users" },
  { value: "SELECTED", label: "Selected users" },
] as const;

function statusBadge(status: string) {
  const map: Record<string, { cls: string; icon: typeof CheckCircle2 }> = {
    SENT: { cls: "text-emerald-400 bg-emerald-500/10", icon: CheckCircle2 },
    FAILED: { cls: "text-red-400 bg-red-500/10", icon: XCircle },
    PENDING: { cls: "text-amber-400 bg-amber-500/10", icon: Clock },
    SCHEDULED: { cls: "text-sky-400 bg-sky-500/10", icon: Clock },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase", cfg.cls)}>
      <Icon size={11} /> {status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Mail; tone?: string }) {
  return (
    <div className="admin-stat-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">{label}</p>
          <p className={cn("text-2xl font-bold text-white mt-1", tone)}>{value.toLocaleString()}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5 text-[var(--admin-muted)]">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function AdminEmailCenter() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("userId");

  const [tab, setTab] = useState<Tab>(initialUserId ? "compose" : "dashboard");
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<OverviewData>("/api/admin/email-center", {
    pollMs: 60_000,
  });

  // Compose state
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [sending, setSending] = useState(false);

  // Broadcast state
  const [broadcastFilter, setBroadcastFilter] = useState<string>("ACTIVE");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);

  // Logs
  const [logQuery, setLogQuery] = useState("");
  const [logStatus, setLogStatus] = useState("ALL");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadUser = useCallback(async (userId: string) => {
    const res = await fetch(`/api/admin/email-center/users?userId=${userId}`);
    const json = await res.json();
    if (json.users?.[0]) {
      setSelectedUser(json.users[0]);
      setTab("compose");
    }
  }, []);

  useEffect(() => {
    if (initialUserId) void loadUser(initialUserId);
  }, [initialUserId, loadUser]);

  const searchUsers = useCallback(async (q: string) => {
    setUserQuery(q);
    if (q.length < 2) {
      setUserResults([]);
      return;
    }
    const res = await fetch(`/api/admin/email-center/users?q=${encodeURIComponent(q)}`);
    const json = await res.json();
    setUserResults(json.users ?? []);
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/admin/email-center/templates");
      const json = await res.json();
      setTemplates(json.templates ?? []);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logQuery) params.set("q", logQuery);
      if (logStatus !== "ALL") params.set("status", logStatus);
      const res = await fetch(`/api/admin/email-center/logs?${params}`);
      const json = await res.json();
      setLogs(json.logs ?? []);
    } finally {
      setLogsLoading(false);
    }
  }, [logQuery, logStatus]);

  useEffect(() => {
    if (tab === "templates") void loadTemplates();
    if (tab === "logs") void loadLogs();
  }, [tab, loadTemplates, loadLogs]);

  const previewRecipientCount = useCallback(async () => {
    const res = await fetch("/api/admin/email-center/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientFilter: broadcastFilter,
        recipientIds: broadcastFilter === "SELECTED" ? selectedUserIds : undefined,
      }),
    });
    const json = await res.json();
    setRecipientCount(json.recipientCount ?? 0);
  }, [broadcastFilter, selectedUserIds]);

  useEffect(() => {
    if (tab === "broadcast" && data?.permissions.canSendBroadcast) {
      void previewRecipientCount();
    }
  }, [tab, broadcastFilter, selectedUserIds, data?.permissions.canSendBroadcast, previewRecipientCount]);

  const applyTemplate = (template: TemplateRow, target: "compose" | "broadcast") => {
    if (target === "compose") {
      setSubject(template.subject);
      setBodyHtml(template.htmlBody);
      setTab("compose");
    } else {
      setBroadcastSubject(template.subject);
      setBroadcastBody(template.htmlBody);
      setTab("broadcast");
    }
    toast.success(`Template "${template.name}" applied`);
  };

  const sendIndividual = async () => {
    if (!selectedUser) {
      toast.error("Select a recipient");
      return;
    }
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/email-center/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, subject, bodyHtml }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");
      toast.success(`Email sent to ${json.to}`);
      setSubject("");
      setBodyHtml("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const sendBroadcast = async () => {
    setBroadcasting(true);
    try {
      const res = await fetch("/api/admin/email-center/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: broadcastSubject,
          bodyHtml: broadcastBody,
          recipientFilter: broadcastFilter,
          recipientIds: broadcastFilter === "SELECTED" ? selectedUserIds : undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Broadcast failed");
      toast.success(
        json.scheduled
          ? `Broadcast scheduled for ${recipientCount} recipients`
          : `Broadcast started for ${json.totalRecipients} recipients`
      );
      setConfirmBroadcast(false);
      setBroadcastSubject("");
      setBroadcastBody("");
      setScheduledAt("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  };

  const saveDraft = async (isBroadcast: boolean) => {
    const res = await fetch("/api/admin/email-center/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: isBroadcast ? broadcastSubject || "Broadcast draft" : subject || "Individual draft",
        subject: isBroadcast ? broadcastSubject : subject,
        htmlBody: isBroadcast ? broadcastBody : bodyHtml,
        recipientFilter: isBroadcast ? broadcastFilter : null,
        recipientIds: isBroadcast && broadcastFilter === "SELECTED" ? selectedUserIds : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        isBroadcast,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Failed to save draft");
      return;
    }
    toast.success("Draft saved");
  };

  const tabs = useMemo(
    () =>
      [
        { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
        { id: "compose" as const, label: "Send to User", icon: User },
        { id: "broadcast" as const, label: "Broadcast", icon: Megaphone },
        { id: "templates" as const, label: "Templates", icon: FileText },
        { id: "logs" as const, label: "Email Logs", icon: History },
      ],
    []
  );

  return (
    <AdminPage>
      <AdminPageHeader
        title="Email Center"
        description="Professional communication hub — send individual messages, broadcasts, and manage templates."
        action={<AdminRefreshButton onClick={refresh} />}
      />

      {!data?.smtpConfigured && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p>SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables before sending.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
              tab === t.id
                ? "bg-accent-brand/15 border-accent-brand/40 text-white"
                : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-white hover:bg-white/5"
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <AdminFetchState loading={loading} error={error} onRetry={refresh} lastUpdated={lastUpdated}>
          {data && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <StatCard label="Total Sent" value={data.stats.totalEmails} icon={Mail} />
                <StatCard label="Sent Today" value={data.stats.emailsToday} icon={Send} />
                <StatCard label="Delivered" value={data.stats.successful} icon={CheckCircle2} tone="text-emerald-400" />
                <StatCard label="Failed" value={data.stats.failed} icon={XCircle} tone="text-red-400" />
                <StatCard label="Pending" value={data.stats.pending} icon={Clock} tone="text-amber-400" />
              </div>
              <AdminFormPanel title="Recent Email Activity">
              <AdminDataCard noPadding>
                <AdminTableScroll>
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Subject</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Sent By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentActivity.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-[var(--admin-muted)] py-8">
                            No emails sent yet
                          </td>
                        </tr>
                      ) : (
                        data.recentActivity.map((row) => (
                          <tr key={row.id}>
                            <td className="text-sm">{row.to}</td>
                            <td className="text-sm max-w-[200px] truncate">{row.subject}</td>
                            <td className="text-xs text-[var(--admin-muted)]">{row.sendType}</td>
                            <td>{statusBadge(row.status)}</td>
                            <td className="text-xs text-[var(--admin-muted)]">{row.sentBy?.name ?? "—"}</td>
                            <td className="text-xs text-[var(--admin-muted)] whitespace-nowrap">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </AdminTableScroll>
              </AdminDataCard>
              </AdminFormPanel>
            </>
          )}
        </AdminFetchState>
      )}

      {tab === "compose" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <AdminFormPanel title="Compose Email">
            <div className="space-y-4">
              <div>
                <label className="admin-label">Search user</label>
                <AdminSearchField
                  value={userQuery}
                  onChange={(v) => void searchUsers(v)}
                  placeholder="Search by name or email…"
                />
                {userResults.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[var(--admin-border)] overflow-hidden max-h-40 overflow-y-auto">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 border-b border-[var(--admin-border)] last:border-0"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserResults([]);
                          setUserQuery("");
                        }}
                      >
                        <span className="text-white font-medium">{u.name}</span>
                        <span className="text-[var(--admin-muted)] ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="admin-label">Recipient</label>
                <input
                  className="admin-input w-full"
                  readOnly
                  value={selectedUser ? `${selectedUser.name} <${selectedUser.email}>` : ""}
                  placeholder="Select a user above"
                />
              </div>
              <div>
                <label className="admin-label">Subject</label>
                <input className="admin-input w-full" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Message</label>
                <AdminRichTextEditor value={bodyHtml} onChange={setBodyHtml} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="admin-btn-ghost text-xs" onClick={() => setShowPreview(!showPreview)}>
                  <Eye size={14} /> {showPreview ? "Hide" : "Show"} preview
                </button>
                <button type="button" className="admin-btn-ghost text-xs" onClick={() => saveDraft(false)}>
                  <Save size={14} /> Save draft
                </button>
              </div>
              <button
                type="button"
                className="admin-btn-primary w-full flex items-center justify-center gap-2"
                disabled={sending || !data?.smtpConfigured}
                onClick={() => void sendIndividual()}
              >
                <Send size={16} /> {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </AdminFormPanel>
          {showPreview && (
            <EmailPreviewFrame subject={subject} bodyHtml={bodyHtml} recipientName={selectedUser?.name} />
          )}
        </div>
      )}

      {tab === "broadcast" && (
        <div className="space-y-4">
          {!data?.permissions.canSendBroadcast ? (
            <div className="rounded-xl border border-[var(--admin-border)] bg-white/[0.03] p-6 text-center">
              <Megaphone size={32} className="mx-auto text-[var(--admin-muted)] mb-3" />
              <p className="text-white font-medium">Broadcast access restricted</p>
              <p className="text-sm text-[var(--admin-muted)] mt-1">
                Only the primary administrator (ADMIN_EMAIL) can send broadcast emails.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <AdminFormPanel title="Broadcast Email">
                <div className="space-y-4">
                  <div>
                    <label className="admin-label">Audience</label>
                    <select
                      className="admin-input w-full"
                      value={broadcastFilter}
                      onChange={(e) => setBroadcastFilter(e.target.value)}
                    >
                      {BROADCAST_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {recipientCount !== null && (
                      <p className="text-xs text-[var(--admin-muted)] mt-1">
                        <Users size={12} className="inline mr-1" />
                        {recipientCount.toLocaleString()} recipient{recipientCount === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  {broadcastFilter === "SELECTED" && (
                    <div>
                      <label className="admin-label">Search &amp; add users</label>
                      <AdminSearchField
                        value={userQuery}
                        onChange={(v) => void searchUsers(v)}
                        placeholder="Search users to add…"
                      />
                      {userResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="block w-full text-left px-2 py-1 text-xs hover:bg-white/5"
                          onClick={() => {
                            setSelectedUserIds((ids) => (ids.includes(u.id) ? ids : [...ids, u.id]));
                            setUserResults([]);
                          }}
                        >
                          + {u.name} ({u.email})
                        </button>
                      ))}
                      {selectedUserIds.length > 0 && (
                        <p className="text-xs text-[var(--admin-muted)] mt-2">{selectedUserIds.length} selected</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="admin-label">Schedule (optional)</label>
                    <input
                      type="datetime-local"
                      className="admin-input w-full"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="admin-label">Subject</label>
                    <input className="admin-input w-full" value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="admin-label">Message</label>
                    <AdminRichTextEditor value={broadcastBody} onChange={setBroadcastBody} minHeight="180px" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="admin-btn-ghost text-xs" onClick={() => saveDraft(true)}>
                      <Save size={14} /> Save draft
                    </button>
                  </div>
                  <button
                    type="button"
                    className="admin-btn-primary w-full flex items-center justify-center gap-2"
                    disabled={!broadcastSubject.trim() || !broadcastBody.trim()}
                    onClick={() => setConfirmBroadcast(true)}
                  >
                    <Megaphone size={16} /> Review &amp; Send Broadcast
                  </button>
                </div>
              </AdminFormPanel>
              <EmailPreviewFrame subject={broadcastSubject} bodyHtml={broadcastBody} />
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <AdminFormPanel title="Email Templates">
        <AdminDataCard noPadding>
          {templatesLoading ? (
            <p className="p-6 text-[var(--admin-muted)]">Loading templates…</p>
          ) : (
            <AdminTableScroll>
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium text-white">{t.name}</td>
                      <td className="text-sm text-[var(--admin-muted)] max-w-[200px] truncate">{t.subject}</td>
                      <td className="text-xs">{t.isDefault ? "Default" : "Custom"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className="admin-btn-ghost text-xs px-2 py-1" onClick={() => applyTemplate(t, "compose")}>
                            Use
                          </button>
                          <button type="button" className="admin-btn-ghost text-xs px-2 py-1" onClick={() => setEditingTemplate(t)}>
                            Edit
                          </button>
                          {!t.isDefault && (
                            <button
                              type="button"
                              className="admin-btn-ghost text-xs px-2 py-1 text-red-400"
                              onClick={async () => {
                                if (!confirm("Delete this template?")) return;
                                await fetch(`/api/admin/email-center/templates/${t.id}`, { method: "DELETE" });
                                void loadTemplates();
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
          )}
        </AdminDataCard>
        </AdminFormPanel>
      )}

      {tab === "logs" && (
        <AdminFormPanel title="Email Logs">
        <AdminDataCard noPadding>
          <div className="p-4 border-b border-[var(--admin-border)] flex flex-wrap gap-3">
            <AdminSearchField
              value={logQuery}
              onChange={setLogQuery}
              placeholder="Search recipient or subject…"
              className="flex-1 min-w-[200px]"
            />
            <select className="admin-input" value={logStatus} onChange={(e) => setLogStatus(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
            <button type="button" className="admin-btn-ghost" onClick={() => void loadLogs()}>
              <RefreshCw size={14} /> Filter
            </button>
          </div>
          {logsLoading ? (
            <p className="p-6 text-[var(--admin-muted)]">Loading logs…</p>
          ) : (
            <AdminTableScroll>
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Sent By</th>
                    <th>Date</th>
                    <th>Failure</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[var(--admin-muted)]">No logs found</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-sm">{log.to}</td>
                        <td className="text-sm max-w-[180px] truncate">{log.subject}</td>
                        <td>{statusBadge(log.status)}</td>
                        <td className="text-xs text-[var(--admin-muted)]">{log.sentBy?.name ?? "—"}</td>
                        <td className="text-xs text-[var(--admin-muted)] whitespace-nowrap">
                          {new Date(log.sentAt ?? log.createdAt).toLocaleString()}
                        </td>
                        <td className="text-xs text-red-400 max-w-[120px] truncate">{log.failureReason ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </AdminTableScroll>
          )}
        </AdminDataCard>
        </AdminFormPanel>
      )}

      <AdminModal open={confirmBroadcast} onClose={() => setConfirmBroadcast(false)} title="Confirm Broadcast">
        <div className="space-y-4">
          <p className="text-sm text-[var(--admin-muted)]">
            You are about to send a broadcast email. Please review the details below.
          </p>
          <div className="rounded-xl bg-white/[0.04] border border-[var(--admin-border)] p-4 space-y-2 text-sm">
            <p><strong className="text-white">Recipients:</strong> {recipientCount?.toLocaleString() ?? "—"}</p>
            <p><strong className="text-white">Subject:</strong> {broadcastSubject}</p>
            <p><strong className="text-white">Delivery:</strong> {scheduledAt ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}` : "Immediate"}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="admin-btn-ghost" onClick={() => setConfirmBroadcast(false)}>Cancel</button>
            <button type="button" className="admin-btn-primary" disabled={broadcasting} onClick={() => void sendBroadcast()}>
              {broadcasting ? "Sending…" : "Confirm & Send"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(editingTemplate)}
        onClose={() => setEditingTemplate(null)}
        title={`Edit Template — ${editingTemplate?.name ?? ""}`}
      >
        {editingTemplate && (
          <div className="space-y-3">
            <input
              className="admin-input w-full"
              value={editingTemplate.subject}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
              placeholder="Subject"
            />
            <AdminRichTextEditor
              value={editingTemplate.htmlBody}
              onChange={(html) => setEditingTemplate({ ...editingTemplate, htmlBody: html })}
              minHeight="160px"
            />
            <button
              type="button"
              className="admin-btn-primary w-full"
              onClick={async () => {
                const res = await fetch(`/api/admin/email-center/templates/${editingTemplate.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    subject: editingTemplate.subject,
                    htmlBody: editingTemplate.htmlBody,
                  }),
                });
                if (!res.ok) {
                  toast.error("Failed to save template");
                  return;
                }
                toast.success("Template updated");
                setEditingTemplate(null);
                void loadTemplates();
              }}
            >
              Save Template
            </button>
          </div>
        )}
      </AdminModal>
    </AdminPage>
  );
}
