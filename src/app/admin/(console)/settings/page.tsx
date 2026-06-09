"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

interface Settings {
  bitcoinWalletAddress: string;
  bitcoinPurchaseLink: string;
  depositInstructions: string;
  depositConfirmationMessage: string;
}

export default function AdminSettingsPage() {
  const [dirty, setDirty] = useState(false);

  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<Settings>(
    "/api/admin/settings",
    { enabled: !dirty, pollMs: 30_000 }
  );
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setSettings(data);
    }
  }, [data, dirty]);

  const markDirty = () => setDirty(true);

  const handleRefresh = () => {
    setDirty(false);
    refresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const payload = {
        ...settings,
        bitcoinWalletAddress: settings.bitcoinWalletAddress.trim(),
        bitcoinPurchaseLink: settings.bitcoinPurchaseLink.trim(),
      };

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      setSettings(json);
      setDirty(false);
      toast.success(
        json.bitcoinWalletAddress
          ? "Settings saved — wallet address is live on customer deposit pages"
          : "Settings saved"
      );
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Platform Settings"
        description="Deposit configuration stored in Supabase — shown on customer Dashboard → Deposit"
        action={
          <button type="button" onClick={handleRefresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <AdminFetchState loading={loading} error={error} onRetry={handleRefresh} lastUpdated={lastUpdated}>
        {settings && (
          <form onSubmit={handleSave} className="admin-card admin-card-glow p-6 space-y-6 max-w-2xl">
            {dirty && (
              <p className="text-xs text-accent-brand border border-accent-brand/30 rounded-lg px-3 py-2">
                Unsaved changes — click Save Settings to publish to the customer dashboard.
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">
                Bitcoin Wallet Address
              </label>
              <input
                className="admin-input font-mono text-sm"
                value={settings.bitcoinWalletAddress ?? ""}
                onChange={(e) => {
                  markDirty();
                  setSettings({ ...settings, bitcoinWalletAddress: e.target.value });
                }}
                placeholder="bc1q..."
                required
              />
              {settings.bitcoinWalletAddress.trim() && (
                <p className="text-[10px] text-emerald-400 mt-2">
                  Customers will see this address on Dashboard → Deposit
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Bitcoin Purchase Link</label>
              <input
                className="admin-input"
                type="url"
                value={settings.bitcoinPurchaseLink ?? ""}
                onChange={(e) => {
                  markDirty();
                  setSettings({ ...settings, bitcoinPurchaseLink: e.target.value });
                }}
                placeholder="https://www.coinbase.com/ or leave empty to hide"
              />
              <p className="text-[10px] text-[var(--admin-muted)] mt-1">Shown as &quot;Buy Bitcoin&quot; on the deposit page. Remove to hide the section.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Deposit Instructions</label>
              <textarea
                className="admin-input min-h-[100px] resize-y"
                value={settings.depositInstructions ?? ""}
                onChange={(e) => {
                  markDirty();
                  setSettings({ ...settings, depositInstructions: e.target.value });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Deposit Confirmation Message</label>
              <textarea
                className="admin-input min-h-[80px] resize-y"
                value={settings.depositConfirmationMessage ?? ""}
                onChange={(e) => {
                  markDirty();
                  setSettings({ ...settings, depositConfirmationMessage: e.target.value });
                }}
              />
            </div>
            <button type="submit" disabled={saving} className="admin-btn-primary disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </AdminFetchState>
    </div>
  );
}
