"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TransactionPinInput from "@/components/dashboard/TransactionPinInput";
import { useI18n } from "@/components/providers/I18nProvider";

type PinStatus = {
  configured: boolean;
  locked: boolean;
  lockedUntil?: string;
  attemptsRemaining?: number;
};

export default function TransactionPinSettings() {
  const { t } = useI18n();
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const loadStatus = () => {
    setLoading(true);
    fetch("/api/dashboard/security/transaction-pin")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const resetForm = () => {
    setPassword("");
    setCurrentPin("");
    setPin("");
    setConfirmPin("");
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || confirmPin.length !== 4) {
      toast.error(t("transactionPin.incomplete"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/security/transaction-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, pin, confirmPin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to set PIN");
      toast.success(t("transactionPin.setupSuccess"));
      resetForm();
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("transactionPin.setupFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPin.length !== 4 || pin.length !== 4 || confirmPin.length !== 4) {
      toast.error(t("transactionPin.incomplete"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/security/transaction-pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPin, newPin: pin, confirmPin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change PIN");
      toast.success(t("transactionPin.changeSuccess"));
      resetForm();
      loadStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("transactionPin.changeFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-text-muted">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="h-10 w-10 rounded-xl bg-accent-brand/15 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-accent-brand" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{t("transactionPin.title")}</p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{t("transactionPin.desc")}</p>
          <p className="text-xs mt-2">
            {status?.configured ? (
              <span className="text-accent-green">{t("transactionPin.statusActive")}</span>
            ) : (
              <span className="text-amber-400">{t("transactionPin.statusRequired")}</span>
            )}
          </p>
          {status?.locked && (
            <p className="text-xs text-accent-red mt-1">{t("transactionPin.locked")}</p>
          )}
        </div>
      </div>

      {!status?.configured ? (
        <form onSubmit={handleSetup} className="space-y-4">
          <Input
            label={t("transactionPin.loginPassword")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">{t("transactionPin.choosePin")}</label>
            <TransactionPinInput value={pin} onChange={setPin} disabled={saving} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">{t("transactionPin.confirmPin")}</label>
            <TransactionPinInput value={confirmPin} onChange={setConfirmPin} disabled={saving} />
          </div>
          <p className="text-xs text-text-muted">{t("transactionPin.weakPinHint")}</p>
          <Button type="submit" isLoading={saving} className="w-full sm:w-auto">
            <Lock size={16} className="mr-2" />
            {t("transactionPin.createPin")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">{t("transactionPin.currentPin")}</label>
            <TransactionPinInput value={currentPin} onChange={setCurrentPin} disabled={saving || !!status?.locked} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">{t("transactionPin.newPin")}</label>
            <TransactionPinInput value={pin} onChange={setPin} disabled={saving || !!status?.locked} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">{t("transactionPin.confirmNewPin")}</label>
            <TransactionPinInput value={confirmPin} onChange={setConfirmPin} disabled={saving || !!status?.locked} />
          </div>
          <Button type="submit" isLoading={saving} variant="outline" className="w-full sm:w-auto" disabled={!!status?.locked}>
            {t("transactionPin.changePin")}
          </Button>
        </form>
      )}
    </div>
  );
}
