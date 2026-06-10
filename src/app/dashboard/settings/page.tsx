"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ProfileImageUpload from "@/components/dashboard/ProfileImageUpload";
import TransactionPinSettings from "@/components/dashboard/TransactionPinSettings";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.profileImage) setProfileImage(data.profileImage);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const notifyItems = [
    t("settings.notifyTransaction"),
    t("settings.notifyInvestment"),
    t("settings.notifySecurity"),
    t("settings.notifyMarketing"),
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="font-semibold text-text-primary mb-6">{t("settings.profile")}</h2>
        <ProfileImageUpload
          initialImage={profileImage}
          onUpdated={setProfileImage}
        />
        <div className="space-y-4 mt-6 pt-6 border-t border-border">
          <Input label={t("auth.fullName")} defaultValue={session?.user?.name || ""} />
          <Input label={t("auth.email")} defaultValue={session?.user?.email || ""} disabled />
          <Input label={t("settings.phone")} placeholder="+1 (555) 000-0000" />
          <Button onClick={() => toast.success(t("common.success"))}>{t("settings.saveChanges")}</Button>
        </div>
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
          <Button variant="outline">{t("settings.changePassword")}</Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-text-primary mb-6">{t("settings.notifications")}</h2>
        <div className="space-y-3">
          {notifyItems.map((item) => (
            <label key={item} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-tertiary/30 transition-colors cursor-pointer">
              <span className="text-sm text-text-primary">{item}</span>
              <input type="checkbox" defaultChecked className="rounded accent-accent-gold" />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
