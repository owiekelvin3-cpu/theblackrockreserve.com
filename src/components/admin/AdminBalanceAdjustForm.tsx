"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface AccountOption {
  id: string;
  name: string;
  currency: string;
  balance: number;
}

interface AdminBalanceAdjustFormProps {
  userId: string;
  accounts: AccountOption[];
  onSuccess?: () => void;
  compact?: boolean;
}

export default function AdminBalanceAdjustForm({
  userId,
  accounts,
  onSuccess,
  compact = false,
}: AdminBalanceAdjustFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accountId: "",
    type: "CREDIT" as "CREDIT" | "DEBIT",
    amount: "",
    reason: "",
  });

  useEffect(() => {
    if (accounts.length && !form.accountId) {
      setForm((f) => ({ ...f, accountId: accounts[0].id }));
    }
  }, [accounts, form.accountId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountId) {
      toast.error("No account selected");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId: form.accountId,
          type: form.type,
          amount: Number(form.amount),
          reason: form.reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Adjustment failed");

      toast.success(form.type === "CREDIT" ? "Funds added" : "Funds removed");
      setForm((f) => ({ ...f, amount: "", reason: "" }));
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) {
    return <p className="text-sm text-[var(--admin-muted)]">No bank accounts for this user.</p>;
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-2" : "space-y-3"}>
      <select
        className="admin-input"
        value={form.accountId}
        onChange={(e) => setForm({ ...form, accountId: e.target.value })}
        required
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} — {formatCurrency(a.balance, a.currency)}
          </option>
        ))}
      </select>
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid sm:grid-cols-2 gap-3"}>
        <select
          className="admin-input"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as "CREDIT" | "DEBIT" })}
        >
          <option value="CREDIT">Add funds</option>
          <option value="DEBIT">Remove funds</option>
        </select>
        <input
          className="admin-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
      </div>
      <input
        className="admin-input"
        placeholder="Reason (required)"
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
        required
        minLength={3}
      />
      <button type="submit" disabled={saving} className="admin-btn-primary text-xs w-full">
        {saving ? "Saving..." : form.type === "CREDIT" ? "Add Funds" : "Remove Funds"}
      </button>
    </form>
  );
}
