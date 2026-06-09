"use client";

import { useEffect, useState } from "react";
import { Shield, Fingerprint, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SecurityOptionsProps = {
  compact?: boolean;
  className?: string;
};

const STORAGE_KEY_2FA = "br-security-2fa";
const STORAGE_KEY_BIO = "br-security-biometric";

export default function SecurityOptions({ compact = false, className }: SecurityOptionsProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    setTwoFactorEnabled(localStorage.getItem(STORAGE_KEY_2FA) === "true");
    setBiometricEnabled(localStorage.getItem(STORAGE_KEY_BIO) === "true");
    setBiometricSupported(
      typeof window !== "undefined" &&
        Boolean(window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable)
    );
    void window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.().then(
      (available) => setBiometricSupported(available)
    );
  }, []);

  const handleSetup2FA = () => {
    toast.info("Two-factor setup will email you a verification code to complete enrollment.");
  };

  const handleToggleBiometric = () => {
    if (!biometricSupported) {
      toast.error("Biometric login is not available on this device or browser.");
      return;
    }
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    localStorage.setItem(STORAGE_KEY_BIO, String(next));
    toast.success(next ? "Biometric login enabled for this device." : "Biometric login disabled.");
  };

  const items = [
    {
      id: "2fa",
      icon: Shield,
      title: "Two-Factor Authentication",
      description: "Add an extra layer of security",
      status: twoFactorEnabled ? "Enabled" : "Not configured",
      statusTone: twoFactorEnabled ? "active" : "muted",
      action: twoFactorEnabled ? "Manage" : "Set up",
      onAction: handleSetup2FA,
    },
    {
      id: "bio",
      icon: Fingerprint,
      title: "Biometric Login",
      description: "Use fingerprint or face ID",
      status: biometricEnabled ? "Enabled" : "Disabled",
      statusTone: biometricEnabled ? "active" : "muted",
      action: biometricEnabled ? "Disable" : "Enable",
      onAction: handleToggleBiometric,
      disabled: !biometricSupported && !biometricEnabled,
    },
  ] as const;

  return (
    <div className={cn(compact ? "grid sm:grid-cols-2 gap-3" : "space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            compact ? "dash-wallet-tile p-4" : "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10",
            "transition-colors hover:border-accent-brand/20"
          )}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center shrink-0">
              <item.icon size={18} className="text-accent-brand" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
              <span
                className={cn(
                  "inline-flex mt-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full",
                  item.statusTone === "active"
                    ? "bg-accent-green/15 text-accent-green"
                    : "bg-white/5 text-text-muted border border-white/10"
                )}
              >
                {item.status}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={item.onAction}
            disabled={"disabled" in item && item.disabled}
            className={cn(
              "inline-flex items-center justify-center gap-1 text-xs font-semibold shrink-0 transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              item.statusTone === "active"
                ? "text-text-muted hover:text-text-primary"
                : "text-accent-brand hover:text-accent-gold-light"
            )}
          >
            {item.action}
            <ChevronRight size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
