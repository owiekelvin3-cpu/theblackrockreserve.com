"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import AppLaunchSplash from "@/components/pwa/AppLaunchSplash";
import ConnectivityProbe from "@/components/diagnostics/ConnectivityProbe";
import NotificationAudioUnlock from "@/components/providers/NotificationAudioUnlock";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { ChatProvider } from "@/components/providers/ChatProvider";
import type { LocaleCode } from "@/lib/i18n/locales";

export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: LocaleCode;
}) {
  return (
    <ThemeProvider>
      <SessionProvider refetchOnWindowFocus>
        <I18nProvider initialLocale={initialLocale}>
        <ChatProvider>
        <NotificationAudioUnlock />
        <ConnectivityProbe />
        <ServiceWorkerRegister />
        <AppLaunchSplash />
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          expand
          visibleToasts={4}
          duration={9000}
          toastOptions={{
            unstyled: false,
            style: {
              background: "#161618",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "var(--text-primary)",
              backdropFilter: "none",
            },
          }}
        />
        </ChatProvider>
        </I18nProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
