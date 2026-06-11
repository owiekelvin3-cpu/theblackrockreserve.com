"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ProfileImageUpload from "@/components/dashboard/ProfileImageUpload";
import TransactionPinSettings from "@/components/dashboard/TransactionPinSettings";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "@/lib/notification-prefs";

type NotifyKey = keyof NotificationPrefs;

const NOTIFY_KEYS: { key: NotifyKey; labelKey: string }[] = [
  { key: "transactions", labelKey: "settings.notifyTransaction" },
  { key: "investments", labelKey: "settings.notifyInvestment" },
  { key: "security", labelKey: "settings.notifySecurity" },
  { key: "marketing", labelKey: "settings.notifyMarketing" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifyKey, setSavingNotifyKey] = useState<NotifyKey | null>(null);

  const loadPreferences = useCallback(() => {
    setLoading(true);
    fetch("/api/dashboard/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.notificationPrefs) setNotificationPrefs(data.notificationPrefs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [session?.user?.id, loadPreferences]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/dashboard/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("settings.saveFailed"));
      toast.success(t("settings.saveSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNotification = async (key: NotifyKey, enabled: boolean) => {
    const previous = notificationPrefs;
    const next = { ...notificationPrefs, [key]: enabled };
    setNotificationPrefs(next);
    setSavingNotifyKey(key);
    try {
      const res = await fetch("/api/dashboard/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationPrefs: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("settings.notifySaveFailed"));
      if (json.notificationPrefs) setNotificationPrefs(json.notificationPrefs);
    } catch (err) {
      setNotificationPrefs(previous);
      toast.error(err instanceof Error ? err.message : t("settings.notifySaveFailed"));
    } finally {
      setSavingNotifyKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="font-semibold text-text-primary mb-6">{t("settings.profile")}</h2>
        <ProfileImageUpload initialImage={profileImage} onUpdated={setProfileImage} />
        <form onSubmit={saveProfile} className="space-y-4 mt-6 pt-6 border-t border-border">
          <Input
            label={t("auth.fullName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
          <Input
            label={t("auth.email")}
            defaultValue={session?.user?.email || ""}
            disabled
          />
          <Input
            label={t("settings.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            disabled={loading}
          />
          <Button type="submit" isLoading={savingProfile} disabled={loading}>
            {t("settings.saveChanges")}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold text-text-primary mb-2">{t("settings.languagePreference")}</h2>
        <p className="text-sm text-text-muted mb-4">{t("settings.languagePreferenceDesc")}</p>
        <LanguageSelector variant="full" />
      </Card>

      <Card>
        <h2 className="font-semibold text-text-primary mb-6">{t("settings.security")}</h2>
        <TransactionPinSettings />
        <div className="mt-6 pt-6 border-t border-border">
          <ChangePasswordForm />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-text-primary mb-6">{t("settings.notifications")}</h2>
        <div className="space-y-3">
          {NOTIFY_KEYS.map(({ key, labelKey }) => (
            <label
              key={key}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
            >
              <span className="text-sm text-text-primary">{t(labelKey)}</span>
              <input
                type="checkbox"
                checked={notificationPrefs[key]}
                disabled={loading || savingNotifyKey === key}
                onChange={(e) => void toggleNotification(key, e.target.checked)}
                className="rounded accent-accent-gold"
              />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
