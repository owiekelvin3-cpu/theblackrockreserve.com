"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ChangePasswordForm() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/security/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("settings.passwordChangeFailed"));
      toast.success(t("settings.passwordChangeSuccess"));
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.passwordChangeFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("settings.changePassword")}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t("settings.currentPassword")}
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <Input
        label={t("settings.newPassword")}
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <Input
        label={t("settings.confirmNewPassword")}
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          className="sm:flex-1"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={saving}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" className="sm:flex-1 gap-2" isLoading={saving}>
          <Lock size={16} />
          {t("settings.updatePassword")}
        </Button>
      </div>
    </form>
  );
}
