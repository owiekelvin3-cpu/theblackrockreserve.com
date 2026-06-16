"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import Button from "@/components/ui/Button";
import AppIconMark from "@/components/ui/AppIconMark";
import { useI18n } from "@/components/providers/I18nProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

type InstallAppPromptProps = {
  variant?: "card" | "inline";
  className?: string;
};

export default function InstallAppPrompt({ variant = "card", className = "" }: InstallAppPromptProps) {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneMode());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIosDevice() && !deferredPrompt) {
      setIosHint(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (installed) return null;

  const showInstallButton = Boolean(deferredPrompt) || isIosDevice();

  if (!showInstallButton) return null;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={() => void handleInstall()}
        className={`inline-flex items-center gap-2 text-sm font-medium text-accent-brand hover:underline ${className}`}
      >
        <Download size={16} />
        {t("pwa.installApp")}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border border-border bg-glass-bg p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-brand">
          <AppIconMark size={40} className="rounded-xl" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-text-primary">{t("pwa.installTitle")}</h3>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">{t("pwa.installDescription")}</p>
          {iosHint && (
            <p className="text-xs text-text-muted mt-3 flex items-start gap-2">
              <Share size={14} className="shrink-0 mt-0.5 text-accent-brand" />
              {t("pwa.iosInstallHint")}
            </p>
          )}
          <div className="mt-4">
            <Button type="button" onClick={() => void handleInstall()} className="inline-flex items-center gap-2">
              <Download size={16} />
              {t("pwa.installApp")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
