"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminFormPanel } from "@/components/admin/AdminUi";
import { formatCurrency } from "@/lib/utils";

type Limits = {
  withdrawalScriptEnabled: boolean;
  minBankWithdrawalUsd: number;
  minProfitBalanceForWithdrawUsd: number;
  minProfitWithdrawalUsd: number;
  imfClearanceFeePercentage: number;
};

export default function AdminWithdrawalLimitsPanel() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minBank, setMinBank] = useState("");
  const [minProfitBalance, setMinProfitBalance] = useState("");
  const [minProfitWithdraw, setMinProfitWithdraw] = useState("");
  const [imfPercent, setImfPercent] = useState("");
  const [scriptEnabled, setScriptEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/admin/withdrawal-limits", { credentials: "include" })
      .then((r) => r.json())
      .then((json: Limits) => {
        setLimits(json);
        setMinBank(String(json.minBankWithdrawalUsd ?? 0));
        setMinProfitBalance(String(json.minProfitBalanceForWithdrawUsd ?? 0));
        setMinProfitWithdraw(String(json.minProfitWithdrawalUsd ?? 0));
        setImfPercent(String(json.imfClearanceFeePercentage ?? 0));
        setScriptEnabled(json.withdrawalScriptEnabled !== false);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/withdrawal-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          withdrawalScriptEnabled: scriptEnabled,
          minBankWithdrawalUsd: Number(minBank) || 0,
          minProfitBalanceForWithdrawUsd: Number(minProfitBalance) || 0,
          minProfitWithdrawalUsd: Number(minProfitWithdraw) || 0,
          imfClearanceFeePercentage: Number(imfPercent) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(json.message || "Limits saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <AdminFormPanel
      title="Withdrawal limits & IMF clearance"
      description="Minimum amounts for bank and profit withdrawals, IMF clearance fee %, and automated withdrawal script (all users)."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--admin-muted)] mb-1 block">Min bank withdrawal ({formatCurrency(0).replace(/[\d.,]/g, "").trim() || "USD"})</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="admin-input w-full"
            value={minBank}
            onChange={(e) => setMinBank(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--admin-muted)] mb-1 block">Min profit balance to withdraw</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="admin-input w-full"
            value={minProfitBalance}
            onChange={(e) => setMinProfitBalance(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--admin-muted)] mb-1 block">Min profit withdrawal amount</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="admin-input w-full"
            value={minProfitWithdraw}
            onChange={(e) => setMinProfitWithdraw(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--admin-muted)] mb-1 block">IMF clearance fee (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="admin-input w-full"
            value={imfPercent}
            onChange={(e) => setImfPercent(e.target.value)}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm mt-4">
        <input type="checkbox" checked={scriptEnabled} onChange={(e) => setScriptEnabled(e.target.checked)} />
        <span className="text-white">Enable automated withdrawal script for all users</span>
      </label>
      <button type="button" className="admin-btn-primary mt-4" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save limits"}
      </button>
      {limits && (
        <p className="text-xs text-[var(--admin-muted)] mt-3">
          Script flow: 1st network fee → bank decline + refund → 2nd network fee → account freeze + refund →
          after unfreeze, new withdrawal with IMF clearance only → final decline + refund.
        </p>
      )}
    </AdminFormPanel>
  );
}
