"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  getLocaleDefinition,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { allMessages, buildMessages } from "@/lib/i18n/messages/overrides";
import type { Messages } from "@/lib/i18n/messages/en";
import { formatMessage, resolveMessage } from "@/lib/i18n/utils";
import { formatCurrencyLocale, formatDateLocale, formatTimeLocale } from "@/lib/i18n/format";

type I18nContextValue = {
  locale: LocaleCode;
  messages: Messages;
  dir: "ltr" | "rtl";
  setLocale: (code: LocaleCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): LocaleCode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && stored in allMessages) return stored as LocaleCode;
  } catch {
    /* ignore */
  }
  return null;
}

function persistLocale(code: LocaleCode) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    // Locale cookie is 2 chars only — never store large payloads in cookies
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function applyDocumentLocale(code: LocaleCode) {
  const def = getLocaleDefinition(code);
  document.documentElement.lang = code;
  document.documentElement.dir = def.dir;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    const detected = stored ?? detectBrowserLocale();
    setLocaleState(detected);
    applyDocumentLocale(detected);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || status !== "authenticated") return;
    fetch("/api/dashboard/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredLocale?: string } | null) => {
        if (data?.preferredLocale && data.preferredLocale in allMessages) {
          const code = data.preferredLocale as LocaleCode;
          setLocaleState(code);
          persistLocale(code);
          applyDocumentLocale(code);
        }
      })
      .catch(() => {});
  }, [hydrated, status]);

  const setLocale = useCallback(
    (code: LocaleCode) => {
      setLocaleState(code);
      persistLocale(code);
      applyDocumentLocale(code);
      if (session?.user) {
        fetch("/api/dashboard/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredLocale: code }),
        }).catch(() => {});
      }
    },
    [session?.user]
  );

  const messages = useMemo(() => buildMessages(locale), [locale]);
  const def = getLocaleDefinition(locale);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      dir: def.dir,
      setLocale,
      t: (key, vars) => {
        const raw = resolveMessage(messages, key) ?? resolveMessage(allMessages.en, key) ?? key;
        return formatMessage(raw, vars);
      },
      formatCurrency: (amount, currency) => formatCurrencyLocale(amount, locale, currency),
      formatDate: (date, options) => formatDateLocale(date, locale, options),
      formatTime: (date) => formatTimeLocale(date, locale),
    }),
    [locale, messages, def.dir, setLocale]
  );

  if (!hydrated) {
    return <>{children}</>;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallback = buildMessages(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE as LocaleCode,
      messages: fallback,
      dir: "ltr" as const,
      setLocale: () => {},
      t: (key: string, vars?: Record<string, string | number>) => {
        const raw = resolveMessage(fallback, key) ?? key;
        return formatMessage(raw, vars);
      },
      formatCurrency: (amount: number, currency?: string) =>
        formatCurrencyLocale(amount, DEFAULT_LOCALE, currency),
      formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
        formatDateLocale(date, DEFAULT_LOCALE, options),
      formatTime: (date: Date | string) => formatTimeLocale(date, DEFAULT_LOCALE),
    };
  }
  return ctx;
}
