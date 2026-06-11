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
  parseLocaleCode,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { buildMessages, englishMessages } from "@/lib/i18n/messages/overrides";
import type { Messages } from "@/lib/i18n/messages/en";
import { createTranslator } from "@/lib/i18n/translate";
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

function readCookieLocale(): LocaleCode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return parseLocaleCode(match?.[1] ? decodeURIComponent(match[1]) : null);
}

function readStoredLocale(): LocaleCode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return parseLocaleCode(stored);
  } catch {
    return null;
  }
}

function resolveClientLocale(serverLocale?: LocaleCode): LocaleCode {
  return readStoredLocale() ?? readCookieLocale() ?? serverLocale ?? detectBrowserLocale();
}

function persistLocale(code: LocaleCode) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
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

function createFallbackContext(locale: LocaleCode): I18nContextValue {
  const messages = buildMessages(locale);
  const def = getLocaleDefinition(locale);
  const t = createTranslator(locale, messages, englishMessages);

  return {
    locale,
    messages,
    dir: def.dir,
    setLocale: () => {},
    t,
    formatCurrency: (amount, currency) => formatCurrencyLocale(amount, locale, currency),
    formatDate: (date, options) => formatDateLocale(date, locale, options),
    formatTime: (date) => formatTimeLocale(date, locale),
  };
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: LocaleCode;
}) {
  const { data: session, status } = useSession();
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof window === "undefined") return initialLocale;
    return resolveClientLocale(initialLocale);
  });

  useEffect(() => {
    const resolved = resolveClientLocale(initialLocale);
    setLocaleState(resolved);
    persistLocale(resolved);
    applyDocumentLocale(resolved);
  }, [initialLocale]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/dashboard/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredLocale?: string } | null) => {
        const code = parseLocaleCode(data?.preferredLocale ?? null);
        if (!code) return;
        setLocaleState(code);
        persistLocale(code);
        applyDocumentLocale(code);
      })
      .catch(() => {});
  }, [status]);

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

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale, messages, englishMessages);
    return {
      locale,
      messages,
      dir: def.dir,
      setLocale,
      t,
      formatCurrency: (amount, currency) => formatCurrencyLocale(amount, locale, currency),
      formatDate: (date, options) => formatDateLocale(date, locale, options),
      formatTime: (date) => formatTimeLocale(date, locale),
    };
  }, [locale, messages, def.dir, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return createFallbackContext(DEFAULT_LOCALE);
  }
  return ctx;
}
