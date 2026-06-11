"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users, UserPlus, Mail, CheckCircle2, XCircle, Clock, Shield,
  ArrowRight, Bell,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DashboardGate from "@/components/dashboard/DashboardGate";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { translateApiErrorMessage } from "@/lib/i18n/api-error-messages";
import { fetchDashboardJson } from "@/lib/fetch-json";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

interface JointAccountSummary {
  id: string;
  accountNumber: string;
  balance: number;
  portfolioValue: number;
  positionsCount: number;
  members: { id: string; name: string; email: string; role: string }[];
  ownershipType: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  inviter?: { id: string; name: string; email: string };
  invitee?: { id: string; name: string; email: string } | null;
  inviteeEmail?: string;
}

interface Approval {
  id: string;
  jointAccountId: string;
  accountNumber: string;
  initiatorName: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface Eligibility {
  eligible: boolean;
  requirements: { id: string; label: string; met: boolean }[];
}

export default function JointAccountsPage() {
  const { t, formatCurrency, formatDate } = useI18n();
  const [accounts, setAccounts] = useState<JointAccountSummary[]>([]);
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState<{ email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"accounts" | "invitations" | "approvals">("accounts");
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchDashboardJson<{ accounts: JointAccountSummary[]; eligibility: Eligibility }>("/api/dashboard/joint-accounts"),
      fetchDashboardJson<{ received: Invitation[]; sent: Invitation[] }>("/api/dashboard/joint-accounts/invitations"),
      fetchDashboardJson<{ approvals: Approval[] }>("/api/dashboard/joint-accounts/approvals"),
    ])
      .then(([acc, inv, appr]) => {
        if (acc.data) {
          setAccounts(acc.data.accounts);
          setEligibility(acc.data.eligibility);
        }
        if (inv.data) {
          setReceived(inv.data.received);
          setSent(inv.data.sent);
        }
        if (appr.data) setApprovals(appr.data.approvals);
      })
      .catch(() => toast.error(t("jointAccounts.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSubmitting(true);
    setNotFound(null);
    try {
      const res = await fetch("/api/dashboard/joint-accounts/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      if (!json.found) {
        setNotFound({ email: json.email });
        return;
      }
      toast.success(t("jointAccounts.inviteSent", { name: json.invitation.inviteeName }));
      setShowForm(false);
      setForm({ email: "", name: "", phone: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? translateApiErrorMessage(err.message, t) : t("jointAccounts.genericFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const sendPlatformInvite = async () => {
    if (!notFound) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/joint-accounts/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: notFound.email, name: form.name, action: "platform_invite" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(t("jointAccounts.platformInviteSent"));
      setNotFound(null);
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const respondInvite = async (id: string, action: "ACCEPT" | "REJECT") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/joint-accounts/invitations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(action === "ACCEPT" ? t("jointAccounts.accountCreated") : t("jointAccounts.invitationDeclined"));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const executeApproval = async (id: string, action: "APPROVE" | "REJECT", transactionPin?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/joint-accounts/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ...(transactionPin ? { transactionPin } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(action === "APPROVE" ? t("jointAccounts.approved") : t("jointAccounts.rejected"));
      load();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const respondApproval = (id: string, action: "APPROVE" | "REJECT") => {
    if (action === "REJECT") {
      executeApproval(id, action).catch((err) => toast.error(err.message));
      return;
    }
    requestPin(async (transactionPin) => {
      await executeApproval(id, action, transactionPin);
    });
  };

  const pendingCount = received.filter((i) => i.status === "PENDING").length;

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand mb-1">{t("jointAccounts.badge")}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {t("jointAccounts.title")} <span className="gold-gradient-text">{t("jointAccounts.titleHighlight")}</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">{t("jointAccounts.subtitle")}</p>
          </div>
          <Button size="sm" onClick={() => { setShowForm(true); setNotFound(null); }} className="shrink-0">
            <UserPlus size={16} className="mr-1" /> {t("jointAccounts.createAccount")}
          </Button>
        </div>

        {eligibility && !eligibility.eligible && (
          <Card className="border border-amber-400/30 bg-amber-400/5">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{t("jointAccounts.verifyFirst")}</h3>
                <ul className="mt-2 space-y-1">
                  {eligibility.requirements.map((r) => (
                    <li key={r.id} className={cn("text-sm flex items-center gap-2", r.met ? "text-accent-green" : "text-[var(--text-secondary)]")}>
                      {r.met ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-amber-400" />}
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {showForm && (
          <Card>
            {notFound ? (
              <div className="space-y-4">
                <p className="text-[var(--text-secondary)]">{t("jointAccounts.userNotFound")}</p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={sendPlatformInvite} isLoading={submitting}>
                    <Mail size={16} className="mr-1" /> {t("jointAccounts.inviteUser")}
                  </Button>
                  <Button variant="outline" onClick={() => setNotFound(null)}>{t("jointAccounts.tryAnotherEmail")}</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={sendInvite} className="space-y-4">
                <h3 className="font-semibold text-[var(--text-primary)]">{t("jointAccounts.inviteCoOwner")}</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm"
                    placeholder={t("jointAccounts.inviteEmail")}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm"
                    placeholder={t("jointAccounts.inviteName")}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm"
                    placeholder={t("jointAccounts.invitePhone")}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" isLoading={submitting}>{t("jointAccounts.sendInvite")}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("jointAccounts.cancel")}</Button>
                </div>
              </form>
            )}
          </Card>
        )}

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-1">
          {(
            [
              { id: "accounts" as const, label: t("jointAccounts.tabAccounts"), icon: Users },
              { id: "invitations" as const, label: t("jointAccounts.tabInvitations"), icon: Mail, badge: pendingCount },
              { id: "approvals" as const, label: t("jointAccounts.tabApprovals"), icon: Bell, badge: approvals.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors",
                activeTab === tab.id
                  ? "text-[var(--text-primary)] border-b-2 border-accent-brand -mb-[3px]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {"badge" in tab && tab.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "accounts" && (
          accounts.length === 0 ? (
            <Card className="text-center py-16">
              <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="font-semibold text-[var(--text-primary)]">{t("jointAccounts.noAccounts")}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">{t("jointAccounts.noAccountsDesc")}</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <Link key={acc.id} href={`/dashboard/joint-accounts/${acc.id}`}>
                  <Card className="hover:border-accent-brand/30 transition-all group h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{t("jointAccounts.accountLabel")}</p>
                        <p className="font-mono font-bold text-[var(--text-primary)]">{acc.accountNumber}</p>
                      </div>
                      <Badge variant="gold">{acc.ownershipType.replace("_", " ")}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">{t("jointAccounts.balance")}</p>
                        <p className="font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(acc.balance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">{t("jointAccounts.portfolio")}</p>
                        <p className="font-mono font-semibold text-accent-brand">{formatCurrency(acc.portfolioValue)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      {acc.members.map((m) => (
                        <span key={m.id} className="text-xs px-2 py-1 rounded-full bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          {m.name.split(" ")[0]}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm text-accent-brand group-hover:gap-2 transition-all">
                      {t("jointAccounts.openAccount")} <ArrowRight size={14} />
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )
        )}

        {activeTab === "invitations" && (
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">{t("jointAccounts.receivedInvites")}</h3>
              {received.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] py-4 text-center">{t("jointAccounts.noReceived")}</p>
              ) : (
                <div className="space-y-3">
                  {received.map((inv) => (
                    <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)]">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{inv.inviter?.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{inv.inviter?.email}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <Clock size={12} /> {t("jointAccounts.expires", { date: formatDate(inv.expiresAt) })}
                        </p>
                      </div>
                      {inv.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => respondInvite(inv.id, "ACCEPT")} disabled={submitting}>{t("jointAccounts.accept")}</Button>
                          <Button size="sm" variant="outline" onClick={() => respondInvite(inv.id, "REJECT")} disabled={submitting}>{t("jointAccounts.reject")}</Button>
                        </div>
                      ) : (
                        <Badge variant="gold">{inv.status}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">{t("jointAccounts.sentInvites")}</h3>
              {sent.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] py-4 text-center">{t("jointAccounts.noSent")}</p>
              ) : (
                <div className="space-y-2">
                  {sent.map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center py-3 border-b border-[var(--border-subtle)]/50 last:border-0">
                      <span className="text-[var(--text-secondary)]">{inv.invitee?.name ?? inv.inviteeEmail}</span>
                      <Badge variant="gold">{inv.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "approvals" && (
          <Card>
            {approvals.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-8 text-center">{t("jointAccounts.noApprovals")}</p>
            ) : (
              <div className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl border border-accent-brand/20 bg-accent-brand/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{a.description}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {a.initiatorName} · {a.accountNumber} · {formatCurrency(a.amount)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respondApproval(a.id, "APPROVE")} disabled={submitting}>{t("jointAccounts.approve")}</Button>
                        <Button size="sm" variant="outline" onClick={() => respondApproval(a.id, "REJECT")} disabled={submitting}>{t("jointAccounts.reject")}</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />
    </DashboardGate>
  );
}
