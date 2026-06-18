"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Monitor, Share, Smartphone } from "lucide-react";
import Button from "@/components/ui/Button";
import AppIconMark from "@/components/ui/AppIconMark";
import { useI18n } from "@/components/providers/I18nProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPlatform = "native" | "ios" | "mac-safari" | "mac-chrome" | "mac-other";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMacDevice() {
  if (typeof navigator === "undefined") return false;
  return /macintosh|mac os x/i.test(navigator.userAgent);
}

function isSafariBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edgios|edg\//i.test(ua);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function resolveInstallPlatform(hasNativePrompt: boolean): InstallPlatform | null {
  if (hasNativePrompt) return "native";
  if (isIosDevice()) return "ios";
  if (!isMacDevice()) return null;
  if (isSafariBrowser()) return "mac-safari";
  if (/chrome|chromium|edg\//i.test(navigator.userAgent)) return "mac-chrome";
  return "mac-other";
}

type InstallAppPromptProps = {
  variant?: "card" | "inline" | "sidebar" | "button";
  className?: string;
};

export default function InstallAppPrompt({ variant = "card", className = "" }: InstallAppPromptProps) {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [hintExpanded, setHintExpanded] = useState(false);

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

  const platform = useMemo(
    () => resolveInstallPlatform(Boolean(deferredPrompt)),
    [deferredPrompt]
  );

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setHintExpanded(true);
  }, [deferredPrompt]);

  if (installed || !platform) return null;

  const hintKey =
    platform === "ios"
      ? "pwa.iosInstallHint"
      : platform === "mac-safari"
        ? "pwa.macSafariInstallHint"
        : platform === "mac-chrome"
          ? "pwa.macChromeInstallHint"
          : platform === "mac-other"
            ? "pwa.macInstallHint"
            : null;

  const showHint = Boolean(hintKey) && (hintExpanded || platform !== "native");
  const HintIcon = platform.startsWith("mac") ? Monitor : Share;

  const hintBlock = showHint && hintKey ? (
    <p className="text-xs text-text-muted mt-3 flex items-start gap-2 leading-relaxed">
      <HintIcon size={14} className="shrink-0 mt-0.5 text-accent-brand" />
      {t(hintKey)}
    </p>
  ) : null;

  if (variant === "inline") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent-brand hover:underline"
        >
          <Download size={16} />
          {t("pwa.installApp")}
        </button>
        {hintBlock}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="dash-nav-item dash-install-nav flex w-full items-center gap-3 px-3 py-3 text-sm font-medium min-h-[44px]"
        >
          <Smartphone size={18} strokeWidth={1.75} />
          <span className="flex-1 text-left">{t("pwa.installApp")}</span>
          <Download size={15} className="text-accent-brand shrink-0 opacity-80" />
        </button>
        {showHint && hintKey && (
          <p className="px-3 pt-1 pb-2 text-[11px] leading-relaxed text-text-muted flex items-start gap-1.5">
            <HintIcon size={12} className="shrink-0 mt-0.5 text-accent-brand" />
            {t(hintKey)}
          </p>
        )}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleInstall()}
          className="inline-flex items-center gap-2 rounded-full"
        >
          <Download size={16} />
          {t("pwa.installApp")}
        </Button>
        {hintBlock}
      </div>
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
          {hintBlock}
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
