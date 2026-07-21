"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminFormPanel,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import type { ContactFaq } from "@/lib/platform-settings";

interface Settings {
  bitcoinWalletAddress: string;
  bitcoinPurchaseLink: string;
  depositInstructions: string;
  depositConfirmationMessage: string;
  withdrawalChargeOverviewMessage: string;
  physicalCardOrdersEnabled: boolean;
  physicalCardRequireKyc: boolean;
  physicalCardRequireInvestment: boolean;
  physicalCardMinBalance: number;
  physicalCardRequirePhone: boolean;
  physicalCardRequireEmail: boolean;
  contactEmail: string;
  contactPhone: string;
  contactAddressLine1: string;
  contactAddressLine2: string;
  contactHqTitle: string;
  contactHqAddress: string;
  contactFaqs: ContactFaq[];
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

  const updateFaq = (index: number, field: keyof ContactFaq, value: string) => {
    if (!settings) return;
    markDirty();
    const contactFaqs = settings.contactFaqs.map((faq, i) =>
      i === index ? { ...faq, [field]: value } : faq
    );
    setSettings({ ...settings, contactFaqs });
  };

  const addFaq = () => {
    if (!settings) return;
    markDirty();
    setSettings({
      ...settings,
      contactFaqs: [...settings.contactFaqs, { question: "", answer: "" }],
    });
  };

  const removeFaq = (index: number) => {
    if (!settings) return;
    markDirty();
    setSettings({
      ...settings,
      contactFaqs: settings.contactFaqs.filter((_, i) => i !== index),
    });
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
        contactEmail: settings.contactEmail.trim(),
        contactPhone: settings.contactPhone.trim(),
        contactAddressLine1: settings.contactAddressLine1.trim(),
        contactAddressLine2: settings.contactAddressLine2.trim(),
        contactHqTitle: settings.contactHqTitle.trim(),
        contactHqAddress: settings.contactHqAddress.trim(),
        contactFaqs: settings.contactFaqs
          .map((faq) => ({
            question: faq.question.trim(),
            answer: faq.answer.trim(),
          }))
          .filter((faq) => faq.question && faq.answer),
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
      toast.success("Settings saved — changes are live on the website");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Platform Settings"
        description="Deposit configuration and public contact page content"
        action={<AdminRefreshButton onClick={handleRefresh} />}
      />

      <AdminFetchState loading={loading} error={error} onRetry={handleRefresh} lastUpdated={lastUpdated}>
        {settings && (
          <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
            {dirty && (
              <p className="text-xs text-accent-brand border border-accent-brand/30 rounded-lg px-3 py-2">
                Unsaved changes — click Save Settings to publish.
              </p>
            )}

            <AdminFormPanel
              title="Deposit settings"
              description="Shown on customer Dashboard → Deposit"
            >
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
            </AdminFormPanel>

            <AdminFormPanel
              title="Withdrawal charge copy"
              description="Shown on Dashboard → Withdrawals → Pay Charge overview. You can use {amount} and {percent} placeholders."
            >
              <div>
                <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">
                  Fee Overview Write-up
                </label>
                <textarea
                  className="admin-input min-h-[120px] resize-y"
                  value={settings.withdrawalChargeOverviewMessage ?? ""}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, withdrawalChargeOverviewMessage: e.target.value });
                  }}
                />
                <p className="mt-2 text-[11px] text-[var(--admin-muted)]">
                  Available placeholders: <span className="font-mono">&#123;amount&#125;</span> and <span className="font-mono">&#123;percent&#125;</span>
                </p>
              </div>
            </AdminFormPanel>

            <AdminFormPanel
              title="Physical card requirements"
              description="Controls eligibility shown on Dashboard → Cards before clients can order"
            >
              <label className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-white">Accept new card orders</span>
                <input
                  type="checkbox"
                  checked={settings.physicalCardOrdersEnabled}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, physicalCardOrdersEnabled: e.target.checked });
                  }}
                />
              </label>
              <label className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-white">Require verified KYC</span>
                <input
                  type="checkbox"
                  checked={settings.physicalCardRequireKyc}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, physicalCardRequireKyc: e.target.checked });
                  }}
                />
              </label>
              <label className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-white">Require active investment</span>
                <input
                  type="checkbox"
                  checked={settings.physicalCardRequireInvestment}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, physicalCardRequireInvestment: e.target.checked });
                  }}
                />
              </label>
              <label className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-white">Require verified email</span>
                <input
                  type="checkbox"
                  checked={settings.physicalCardRequireEmail}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, physicalCardRequireEmail: e.target.checked });
                  }}
                />
              </label>
              <label className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-white">Require phone on profile</span>
                <input
                  type="checkbox"
                  checked={settings.physicalCardRequirePhone}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, physicalCardRequirePhone: e.target.checked });
                  }}
                />
              </label>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">
                  Minimum account balance (USD)
                </label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step={1}
                  value={settings.physicalCardMinBalance}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, physicalCardMinBalance: Number(e.target.value) || 0 });
                  }}
                />
              </div>
            </AdminFormPanel>

            <AdminFormPanel
              title="Contact page"
              description="Contact information and FAQs shown on the public /contact page"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Support Email</label>
                  <input
                    className="admin-input"
                    type="email"
                    value={settings.contactEmail ?? ""}
                    onChange={(e) => {
                      markDirty();
                      setSettings({ ...settings, contactEmail: e.target.value });
                    }}
                    placeholder="support@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Phone</label>
                  <input
                    className="admin-input"
                    value={settings.contactPhone ?? ""}
                    onChange={(e) => {
                      markDirty();
                      setSettings({ ...settings, contactPhone: e.target.value });
                    }}
                    placeholder="+1 (800) 555-0199"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Address Line 1</label>
                <input
                  className="admin-input"
                  value={settings.contactAddressLine1 ?? ""}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, contactAddressLine1: e.target.value });
                  }}
                  placeholder="1 Blackrock Plaza, Suite 400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Address Line 2</label>
                <input
                  className="admin-input"
                  value={settings.contactAddressLine2 ?? ""}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, contactAddressLine2: e.target.value });
                  }}
                  placeholder="New York, NY 10004"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Map Card Title</label>
                <input
                  className="admin-input"
                  value={settings.contactHqTitle ?? ""}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, contactHqTitle: e.target.value });
                  }}
                  placeholder="New York Headquarters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Map Card Address</label>
                <input
                  className="admin-input"
                  value={settings.contactHqAddress ?? ""}
                  onChange={(e) => {
                    markDirty();
                    setSettings({ ...settings, contactHqAddress: e.target.value });
                  }}
                  placeholder="1 Blackrock Plaza, Suite 400 · New York, NY 10004"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-medium text-[var(--admin-muted)]">FAQ Items</label>
                  <button
                    type="button"
                    onClick={addFaq}
                    className="admin-btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add FAQ
                  </button>
                </div>

                {settings.contactFaqs.map((faq, index) => (
                  <div key={index} className="rounded-xl border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-white">FAQ {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeFaq(index)}
                        className="text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                        aria-label={`Remove FAQ ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      className="admin-input"
                      value={faq.question}
                      onChange={(e) => updateFaq(index, "question", e.target.value)}
                      placeholder="Question"
                    />
                    <textarea
                      className="admin-input min-h-[80px] resize-y"
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, "answer", e.target.value)}
                      placeholder="Answer"
                    />
                  </div>
                ))}
              </div>
            </AdminFormPanel>

            <button type="submit" disabled={saving} className="admin-btn-primary disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </AdminFetchState>
    </AdminPage>
  );
}
