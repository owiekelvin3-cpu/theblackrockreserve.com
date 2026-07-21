"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CreditCard,
  Globe,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import VerificationBadge from "@/components/ui/VerificationBadge";
import AccountNumberDisplay from "@/components/dashboard/AccountNumberDisplay";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LanguageSelector from "@/components/ui/LanguageSelector";
import CurrencySelector from "@/components/ui/CurrencySelector";
import ProfileImageUpload from "@/components/dashboard/ProfileImageUpload";
import InstallAppPrompt from "@/components/pwa/InstallAppPrompt";
import TransactionPinSettings from "@/components/dashboard/TransactionPinSettings";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { getVerificationBadgeLabel, hasVerificationBadge } from "@/lib/verification-badge";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "@/lib/notification-prefs";

type NotifyKey = keyof NotificationPrefs;
type ProfileTab = "profile" | "accounts" | "security" | "preferences";

const NOTIFY_KEYS: {
  key: NotifyKey;
  labelKey: string;
  descKey: string;
  icon: typeof Bell;
}[] = [
  { key: "transactions", labelKey: "settings.notifyTransaction", descKey: "settings.notifyTransactionDesc", icon: CreditCard },
  { key: "investments", labelKey: "settings.notifyInvestment", descKey: "settings.notifyInvestmentDesc", icon: Sparkles },
  { key: "security", labelKey: "settings.notifySecurity", descKey: "settings.notifySecurityDesc", icon: Shield },
  { key: "marketing", labelKey: "settings.notifyMarketing", descKey: "settings.notifyMarketingDesc", icon: Mail },
];

const TAB_ITEMS: { id: ProfileTab; labelKey: string; icon: typeof User }[] = [
  { id: "profile", labelKey: "settings.profile", icon: User },
  { id: "accounts", labelKey: "settings.accountsTab", icon: Wallet },
  { id: "security", labelKey: "settings.security", icon: Lock },
  { id: "preferences", labelKey: "settings.preferencesTab", icon: Globe },
];

function ProfileSkeleton() {
  return (
    <div className="profile-page">
      <div className="profile-skeleton-line w-48 h-8" />
      <div className="profile-skeleton-line w-72 h-4 mt-2" />
      <div className="profile-client-card profile-skeleton-block h-28 mt-8" />
      <div className="profile-skeleton-block h-12 mt-6" />
      <div className="profile-skeleton-block h-96 mt-4" />
    </div>
  );
}

function PremiumToggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("profile-toggle", checked && "profile-toggle-on", disabled && "opacity-50 cursor-not-allowed")}
    >
      <span className="profile-toggle-thumb" />
    </button>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { t, formatDate } = useI18n();
  const { verificationBadge, image: liveProfileImage } = useProfileImage();

  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [userAccountNumber, setUserAccountNumber] = useState<string | null>(null);
  const [accountNumberRevealed, setAccountNumberRevealed] = useState(false);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifyKey, setSavingNotifyKey] = useState<NotifyKey | null>(null);

  const displayImage = liveProfileImage ?? profileImage;
  const displayName = name || session?.user?.name || "";
  const clientId = session?.user?.id?.slice(0, 8).toUpperCase() ?? "—";

  const memberSinceLabel = useMemo(() => {
    if (!memberSince) return null;
    return formatDate(memberSince, { month: "long", year: "numeric" });
  }, [memberSince, formatDate]);

  const loadPreferences = useCallback(() => {
    setLoading(true);
    fetch("/api/dashboard/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.name) setName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.memberSince) setMemberSince(data.memberSince);
        if (data.notificationPrefs) setNotificationPrefs(data.notificationPrefs);
        if (data.accountNumber) setUserAccountNumber(data.accountNumber);
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

  const copyUserAccountNumber = async () => {
    if (!userAccountNumber) return;
    try {
      await navigator.clipboard.writeText(userAccountNumber);
      setCopiedAccountNumber(true);
      toast.success(t("settings.accountNumberCopied"));
      window.setTimeout(() => setCopiedAccountNumber(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <h1 className="profile-page-title">{t("settings.pageTitle")}</h1>
        <p className="profile-page-desc">{t("settings.pageDesc")}</p>
      </header>

      <section className="profile-client-card">
        <div className="profile-client-main">
          <div className="profile-client-avatar-wrap">
            <ProfileAvatar name={displayName} image={displayImage} size="2xl" className="profile-client-avatar" />
            {hasVerificationBadge(verificationBadge) && (
              <span className="profile-client-badge">
                <VerificationBadge type={verificationBadge} size="sm" />
              </span>
            )}
          </div>
          <div className="profile-client-info min-w-0">
            <p className="profile-client-tier">{t("settings.privateClient")}</p>
            <div className="profile-client-name-row">
              <h2 className="profile-client-name truncate">{displayName}</h2>
              {hasVerificationBadge(verificationBadge) && (
                <VerificationBadge type={verificationBadge} size="xs" />
              )}
            </div>
            <p className="profile-client-email truncate">{session?.user?.email}</p>
          </div>
        </div>

        <div className="profile-client-stats">
          <div className="profile-stat">
            <span className="profile-stat-label">{t("settings.clientId")}</span>
            <span className="profile-stat-value font-mono">{clientId}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-label">{t("common.status")}</span>
            <span className="profile-stat-value profile-stat-value-active">
              <span className="profile-status-dot" />
              {t("settings.accountActive")}
            </span>
          </div>
          {memberSinceLabel && (
            <div className="profile-stat">
              <span className="profile-stat-label">{t("settings.memberSince")}</span>
              <span className="profile-stat-value">{memberSinceLabel}</span>
            </div>
          )}
          {hasVerificationBadge(verificationBadge) && (
            <div className="profile-stat">
              <span className="profile-stat-label">{t("pwa.verifiedAccount")}</span>
              <span className="profile-stat-value profile-stat-value-gold">
                {getVerificationBadgeLabel(verificationBadge)}
              </span>
            </div>
          )}
        </div>
      </section>

      <nav className="profile-tabs" role="tablist" aria-label="Profile sections">
        {TAB_ITEMS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            onClick={() => setActiveTab(id)}
            className={cn("profile-tab", activeTab === id && "profile-tab-active")}
            aria-selected={activeTab === id}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="profile-tab-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab === "profile" && (
            <div className="profile-card">
              <div className="profile-card-head">
                <h3 className="profile-card-title">{t("settings.identitySection")}</h3>
                <p className="profile-card-subtitle">{t("settings.identitySectionDesc")}</p>
              </div>
              <div className="profile-card-body">
                <ProfileImageUpload
                  initialImage={profileImage}
                  onUpdated={setProfileImage}
                />
                <form onSubmit={saveProfile} className="profile-fields">
                  <div className="profile-field">
                    <label className="profile-field-label" htmlFor="profile-name">
                      {t("auth.fullName")}
                    </label>
                    <div className="profile-field-control">
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="profile-field">
                    <label className="profile-field-label" htmlFor="profile-email">
                      {t("auth.email")}
                    </label>
                    <div className="profile-field-control">
                      <div className="profile-field-readonly">
                        <Mail size={15} className="text-text-muted shrink-0" />
                        <span className="truncate">{session?.user?.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="profile-field">
                    <label className="profile-field-label" htmlFor="profile-phone">
                      {t("settings.phone")}
                    </label>
                    <div className="profile-field-control">
                      <Input
                        id="profile-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div className="profile-form-footer">
                    <Button type="submit" isLoading={savingProfile}>
                      {t("settings.saveChanges")}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <div className="profile-card">
              <div className="profile-card-head">
                <h3 className="profile-card-title">{t("settings.bankingSection")}</h3>
                <p className="profile-card-subtitle">{t("settings.bankAccountsDesc")}</p>
              </div>
              <div className="profile-card-body">
                {userAccountNumber ? (
                  <div className="profile-user-account-number">
                    <AccountNumberDisplay
                      value={userAccountNumber}
                      revealed={accountNumberRevealed}
                      onToggleReveal={() => setAccountNumberRevealed((v) => !v)}
                      onCopy={() => void copyUserAccountNumber()}
                      copied={copiedAccountNumber}
                      size="lg"
                      label={t("settings.accountNumberLabel")}
                      copyLabel={t("settings.copyAccountNumber")}
                      showNumberLabel={t("settings.showAccountNumber")}
                      hideNumberLabel={t("settings.hideAccountNumber")}
                    />
                    <p className="profile-user-account-number-hint">{t("settings.incomingTransfersToMain")}</p>
                  </div>
                ) : (
                  <p className="profile-empty">{t("common.loading")}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="profile-security-grid">
              <div className="profile-card">
                <div className="profile-card-head">
                  <h3 className="profile-card-title">{t("transactionPin.title")}</h3>
                  <p className="profile-card-subtitle">{t("transactionPin.desc")}</p>
                </div>
                <div className="profile-card-body profile-card-body-flush">
                  <TransactionPinSettings />
                </div>
              </div>
              <div className="profile-card">
                <div className="profile-card-head">
                  <h3 className="profile-card-title">{t("settings.changePassword")}</h3>
                  <p className="profile-card-subtitle">{t("settings.securityDesc")}</p>
                </div>
                <div className="profile-card-body">
                  <ChangePasswordForm />
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="profile-prefs-grid">
              <div className="profile-card profile-card-dropdown">
                <div className="profile-card-head">
                  <h3 className="profile-card-title">{t("settings.currencyPreference")}</h3>
                  <p className="profile-card-subtitle">{t("settings.currencyPreferenceDesc")}</p>
                  {verificationBadge === "GOLD" && (
                    <p className="profile-card-subtitle mt-1 text-accent-gold/90">
                      {t("settings.currencyPreferenceGoldNote")}
                    </p>
                  )}
                </div>
                <div className="profile-card-body">
                  <CurrencySelector variant="full" />
                </div>
              </div>

              <div className="profile-card profile-card-dropdown">
                <div className="profile-card-head">
                  <h3 className="profile-card-title">{t("settings.languagePreference")}</h3>
                  <p className="profile-card-subtitle">{t("settings.languagePreferenceDesc")}</p>
                </div>
                <div className="profile-card-body">
                  <LanguageSelector variant="full" />
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-head">
                  <h3 className="profile-card-title">{t("settings.notifications")}</h3>
                  <p className="profile-card-subtitle">{t("settings.notificationsDesc")}</p>
                </div>
                <div className="profile-notify-list">
                  {NOTIFY_KEYS.map(({ key, labelKey, descKey, icon: Icon }) => (
                    <div key={key} className="profile-notify-row">
                      <div className="profile-notify-icon">
                        <Icon size={16} />
                      </div>
                      <div className="profile-notify-copy min-w-0 flex-1">
                        <p className="profile-notify-label">{t(labelKey)}</p>
                        <p className="profile-notify-desc">{t(descKey)}</p>
                      </div>
                      <PremiumToggle
                        checked={notificationPrefs[key]}
                        disabled={savingNotifyKey === key}
                        onChange={(enabled) => void toggleNotification(key, enabled)}
                        label={t(labelKey)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="profile-card profile-install-card">
                <InstallAppPrompt variant="card" className="profile-install-prompt" />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
