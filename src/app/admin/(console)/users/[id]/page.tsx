"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Ban, CheckCircle, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminKycBadge, AdminStatusBadge } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import AdminBalanceAdjustForm from "@/components/admin/AdminBalanceAdjustForm";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  accountType: string;
  status: string;
  kycStatus: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  hasPassword: boolean;
  passwordPlaintext: string | null;
  kycIdFront: string | null;
  kycIdBack: string | null;
  updatedAt: string;
  createdAt: string;
  accounts: { id: string; name: string; type: string; currency: string; balance: number }[];
  transactions: { id: string; type: string; amount: number; description: string; status: string; createdAt: string }[];
  investments: { id: string; symbol: string; name: string; shares: number; avgPrice: number }[];
  depositRequests: { id: string; amountUsd: number | null; status: string; txHash: string | null; createdAt: string }[];
  balanceAdjustments: {
    id: string; type: string; amount: number; reason: string;
    balanceBefore: number; balanceAfter: number; createdAt: string; adminName: string;
  }[];
}

function PasswordCredentialRow({ password }: { password: string | null }) {
  const [visible, setVisible] = useState(false);

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    toast.success("Password copied");
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--admin-border)]/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Password</p>
        {password ? (
          <p className="text-sm text-white font-mono break-all">
            {visible ? password : "••••••••••••"}
          </p>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">
            Not on file — use &quot;Set new password&quot; below to save a viewable password
          </p>
        )}
      </div>
      {password && (
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="admin-btn-ghost p-1.5"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button type="button" onClick={copy} className="admin-btn-ghost p-1.5" aria-label="Copy password">
            <Copy size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function CredentialRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--admin-border)]/50 last:border-0">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">{label}</p>
        <p className="text-sm text-white break-all">{value}</p>
      </div>
      {copyable && (
        <button type="button" onClick={copy} className="admin-btn-ghost p-1.5 shrink-0" aria-label={`Copy ${label}`}>
          <Copy size={14} />
        </button>
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: user, error, loading, refresh, lastUpdated } = useAdminFetch<UserDetail>(`/api/admin/users/${id}`);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", accountType: "PERSONAL" });

  useEffect(() => {
    if (!user) return;
    setEditForm({ name: user.name, email: user.email, phone: user.phone ?? "", accountType: user.accountType });
  }, [user]);

  const totalBalance = user?.accounts.reduce((s, a) => s + a.balance, 0) ?? 0;

  const patchUser = async (data: Record<string, unknown>, msg: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(msg);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    patchUser(editForm, "Profile updated");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Password reset failed");
      toast.success("Password updated — share the new password securely with the customer");
      setNewPassword("");
      setShowPasswordForm(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = () => {
    if (!user) return;
    const next = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    patchUser({ status: next }, next === "SUSPENDED" ? "Account suspended" : "Account activated");
  };

  const deleteUser = async () => {
    if (!confirm("Permanently delete this user and all their data?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("User deleted");
    router.push("/admin/users");
  };

  if (loading || error || !user) {
    return (
      <AdminFetchState
        loading={loading}
        error={error ?? (!loading && !user ? "User not found in database" : null)}
        onRetry={refresh}
        lastUpdated={lastUpdated}
      >
        <></>
      </AdminFetchState>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 admin-link text-xs">
        <ArrowLeft size={14} /> Back to users
      </Link>

      <AdminPageHeader
        title={user.name}
        description={`${user.email} · Joined ${new Date(user.createdAt).toLocaleDateString()} · ${formatCurrency(totalBalance)} total balance`}
        action={
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-3 py-1.5">Refresh</button>
            <button onClick={toggleStatus} disabled={saving} className="admin-btn-ghost flex items-center gap-1.5 text-xs">
              {user.status === "ACTIVE" ? <><Ban size={14} /> Suspend</> : <><CheckCircle size={14} /> Activate</>}
            </button>
            <button onClick={deleteUser} className="admin-btn-ghost flex items-center gap-1.5 text-xs text-red-400 border-red-500/30">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        }
      />

      <div className="flex gap-3 flex-wrap">
        <AdminStatusBadge status={user.status} />
        <AdminKycBadge status={user.kycStatus} />
        <span className="admin-pill">{user.accountType}</span>
        <span className="admin-pill">{user.emailVerified ? "Email verified" : "Email unverified"}</span>
      </div>

      <div className="admin-card admin-card-glow p-5">
        <h2 className="font-semibold text-white mb-1">Account Credentials</h2>
        <p className="text-xs text-[var(--admin-muted)] mb-4">
          Login email, phone, and password stored for this account. Passwords are saved when users register or when you set a new password below.
        </p>
        <div className="grid md:grid-cols-2 gap-x-8">
          <CredentialRow label="Email (login)" value={user.email} copyable />
          <CredentialRow label="Phone" value={user.phone ?? "—"} copyable={!!user.phone} />
          <CredentialRow
            label="Date of birth"
            value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "—"}
          />
          <CredentialRow label="Account type" value={user.accountType} />
          <CredentialRow
            label="Email verified"
            value={
              user.emailVerifiedAt
                ? new Date(user.emailVerifiedAt).toLocaleString()
                : user.emailVerified
                  ? "Yes"
                  : "No"
            }
          />
          <CredentialRow label="User ID" value={user.id} copyable />
          <PasswordCredentialRow password={user.passwordPlaintext} />
          <CredentialRow label="Last updated" value={new Date(user.updatedAt).toLocaleString()} />
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--admin-border)]">
          {!showPasswordForm ? (
            <button type="button" onClick={() => setShowPasswordForm(true)} className="admin-btn-ghost text-xs">
              Set new password
            </button>
          ) : (
            <form onSubmit={resetPassword} className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="relative flex-1">
                <input
                  className="admin-input pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (8+ chars, uppercase & number)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" disabled={saving} className="admin-btn-primary text-xs whitespace-nowrap">
                Save Password
              </button>
              <button type="button" onClick={() => setShowPasswordForm(false)} className="admin-btn-ghost text-xs">
                Cancel
              </button>
            </form>
          )}
        </div>

        {(user.kycIdFront || user.kycIdBack) && (
          <div className="mt-4 pt-4 border-t border-[var(--admin-border)] grid sm:grid-cols-2 gap-4">
            {user.kycIdFront && (
              <div>
                <p className="text-[10px] uppercase text-[var(--admin-muted)] mb-2">KYC ID (front)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.kycIdFront} alt="KYC front" className="rounded-lg max-h-40 border border-[var(--admin-border)]" />
              </div>
            )}
            {user.kycIdBack && (
              <div>
                <p className="text-[10px] uppercase text-[var(--admin-muted)] mb-2">KYC ID (back)</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.kycIdBack} alt="KYC back" className="rounded-lg max-h-40 border border-[var(--admin-border)]" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="admin-card admin-card-glow p-5">
          <h2 className="font-semibold text-white mb-4">Edit Profile</h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <input className="admin-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" required />
            <input className="admin-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" required />
            <input className="admin-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone" />
            <select className="admin-input" value={editForm.accountType} onChange={(e) => setEditForm({ ...editForm, accountType: e.target.value })}>
              <option value="PERSONAL">Personal</option>
              <option value="BUSINESS">Business</option>
            </select>
            <div className="flex gap-2 pt-2 flex-wrap">
              <button type="submit" disabled={saving} className="admin-btn-primary text-xs">Save Profile</button>
              <button type="button" onClick={() => patchUser({ kycStatus: "VERIFIED" }, "KYC approved")} className="admin-btn-ghost text-xs">Approve KYC</button>
              <button type="button" onClick={() => patchUser({ kycStatus: "REJECTED" }, "KYC rejected")} className="admin-btn-ghost text-xs text-red-400">Reject KYC</button>
            </div>
          </form>
        </div>

        <div className="admin-card admin-card-glow p-5">
          <h2 className="font-semibold text-white mb-1">Adjust Balance</h2>
          <p className="text-xs text-[var(--admin-muted)] mb-4">Add or remove funds from any account. Changes sync to the customer dashboard immediately.</p>
          <AdminBalanceAdjustForm userId={user.id} accounts={user.accounts} onSuccess={refresh} />
        </div>
      </div>

      <div className="admin-card p-5">
        <h2 className="font-semibold text-white mb-4">Bank Accounts ({user.accounts.length})</h2>
        {user.accounts.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No accounts in database</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {user.accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--admin-border)]/50">
                    <td className="py-2 text-sm text-white">{a.name}</td>
                    <td className="py-2 text-xs text-[var(--admin-muted)]">{a.type}</td>
                    <td className="py-2 text-right admin-amount">{formatCurrency(a.balance, a.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card p-5">
        <h2 className="font-semibold text-white mb-4">Recent Transactions ({user.transactions.length})</h2>
        {user.transactions.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {user.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--admin-border)]/50">
                    <td className="py-2 text-sm text-white">{t.description}</td>
                    <td className="py-2 text-xs text-[var(--admin-muted)]">{t.type}</td>
                    <td className="py-2"><span className="admin-badge admin-badge-submitted text-[10px]">{t.status}</span></td>
                    <td className="py-2 text-right admin-amount">{formatCurrency(t.amount)}</td>
                    <td className="py-2 text-right text-xs text-[var(--admin-muted)]">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card p-5">
        <h2 className="font-semibold text-white mb-4">Deposit Requests ({user.depositRequests.length})</h2>
        {user.depositRequests.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">No deposit requests</p>
        ) : (
          <div className="space-y-2">
            {user.depositRequests.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-[var(--admin-border)]/50 last:border-0">
                <div>
                  <p className="text-xs font-mono text-[var(--admin-muted)] truncate max-w-xs">{d.txHash ?? "No hash"}</p>
                  <p className="text-[10px] text-[var(--admin-muted)]">{new Date(d.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`admin-badge ${d.status === "APPROVED" ? "admin-badge-verified" : d.status === "PENDING" ? "admin-badge-submitted" : "admin-badge-rejected"}`}>{d.status}</span>
                  {d.amountUsd != null && <p className="text-xs admin-amount mt-1">{formatCurrency(d.amountUsd)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user.investments.length > 0 && (
        <div className="admin-card p-5">
          <h2 className="font-semibold text-white mb-4">Investments ({user.investments.length})</h2>
          <div className="space-y-2">
            {user.investments.map((i) => (
              <div key={i.id} className="flex justify-between py-2 border-b border-[var(--admin-border)]/50 last:border-0">
                <div>
                  <p className="text-sm text-white">{i.symbol}</p>
                  <p className="text-[10px] text-[var(--admin-muted)]">{i.name}</p>
                </div>
                <p className="text-xs admin-amount">{i.shares} @ {formatCurrency(i.avgPrice)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {user.balanceAdjustments.length > 0 && (
        <div className="admin-card p-5">
          <h2 className="font-semibold text-white mb-4">Balance Adjustment History</h2>
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-[var(--admin-border)]">
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-left py-2">Reason</th>
                  <th className="text-left py-2">Admin</th>
                  <th className="text-right py-2">Before → After</th>
                  <th className="text-right py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {user.balanceAdjustments.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--admin-border)]/50">
                    <td className="py-2"><span className={`admin-badge ${a.type === "CREDIT" ? "admin-badge-verified" : "admin-badge-rejected"}`}>{a.type}</span></td>
                    <td className="py-2 text-right admin-amount">{formatCurrency(a.amount)}</td>
                    <td className="py-2 text-sm text-[var(--admin-muted)]">{a.reason}</td>
                    <td className="py-2 text-xs text-[var(--admin-muted)]">{a.adminName}</td>
                    <td className="py-2 text-right text-xs font-mono">{formatCurrency(a.balanceBefore)} → {formatCurrency(a.balanceAfter)}</td>
                    <td className="py-2 text-right text-xs text-[var(--admin-muted)]">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
