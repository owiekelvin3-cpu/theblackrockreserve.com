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
import { formatDateLocale, formatTimeLocale } from "@/lib/i18n/format";
import {
  CURRENCY_COOKIE,
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  FALLBACK_RATES,
  convertFromUsd as convertUsdAmount,
  convertToUsd as convertDisplayToUsd,
  formatMoneyDisplay,
  getCurrencySymbol,
  parseCurrencyCode,
  type ExchangeRates,
  type SupportedCurrency,
} from "@/lib/currency";

type I18nContextValue = {
  locale: LocaleCode;
  messages: Messages;
  dir: "ltr" | "rtl";
  setLocale: (code: LocaleCode) => void;
  preferredCurrency: SupportedCurrency;
  currencySymbol: string;
  exchangeRates: ExchangeRates;
  ratesLoading: boolean;
  setPreferredCurrency: (code: SupportedCurrency) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Format a USD-stored amount in the user's preferred currency. */
  formatCurrency: (amountUsd: number, currencyOverride?: string) => string;
  /** Convert USD amount to display currency numeric value. */
  convertFromUsd: (amountUsd: number, currencyOverride?: string) => number;
  /** Convert user-entered display amount to USD for API submission. */
  convertToUsd: (amountDisplay: number, currencyOverride?: string) => number;
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

function readCookieCurrency(): SupportedCurrency | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([^;]*)`));
  const code = match?.[1] ? decodeURIComponent(match[1]) : null;
  return code && parseCurrencyCode(code) !== DEFAULT_CURRENCY ? parseCurrencyCode(code) : code ? parseCurrencyCode(code) : null;
}

function readStoredCurrency(): SupportedCurrency | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return stored ? parseCurrencyCode(stored) : null;
  } catch {
    return null;
  }
}

function resolveClientLocale(serverLocale?: LocaleCode): LocaleCode {
  return readStoredLocale() ?? readCookieLocale() ?? serverLocale ?? detectBrowserLocale();
}

function resolveClientCurrency(serverCurrency?: SupportedCurrency): SupportedCurrency {
  return readStoredCurrency() ?? readCookieCurrency() ?? serverCurrency ?? DEFAULT_CURRENCY;
}

function persistLocale(code: LocaleCode) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function persistCurrency(code: SupportedCurrency) {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    document.cookie = `${CURRENCY_COOKIE}=${code};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
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
  const rates = FALLBACK_RATES;

  return {
    locale,
    messages,
    dir: def.dir,
    setLocale: () => {},
    preferredCurrency: DEFAULT_CURRENCY,
    currencySymbol: getCurrencySymbol(DEFAULT_CURRENCY),
    exchangeRates: rates,
    ratesLoading: false,
    setPreferredCurrency: () => {},
    t,
    formatCurrency: (amountUsd, currencyOverride) => {
      const target = parseCurrencyCode(currencyOverride ?? DEFAULT_CURRENCY);
      const converted = convertUsdAmount(amountUsd, target, rates);
      return formatMoneyDisplay(converted, target, def.bcp47);
    },
    convertFromUsd: (amountUsd, currencyOverride) =>
      convertUsdAmount(amountUsd, parseCurrencyCode(currencyOverride ?? DEFAULT_CURRENCY), rates),
    convertToUsd: (amountDisplay, currencyOverride) =>
      convertDisplayToUsd(amountDisplay, parseCurrencyCode(currencyOverride ?? DEFAULT_CURRENCY), rates),
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
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale);
  const [preferredCurrency, setPreferredCurrencyState] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  useEffect(() => {
    const resolved = resolveClientLocale(initialLocale);
    setLocaleState(resolved);
    persistLocale(resolved);
    applyDocumentLocale(resolved);
    setPreferredCurrencyState(resolveClientCurrency());
  }, [initialLocale]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/currency/rates")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rates?: ExchangeRates } | null) => {
        if (cancelled || !data?.rates) return;
        setExchangeRates({ ...FALLBACK_RATES, ...data.rates, USD: 1 });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/dashboard/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredLocale?: string; preferredCurrency?: string } | null) => {
        const code = parseLocaleCode(data?.preferredLocale ?? null);
        if (code) {
          setLocaleState(code);
          persistLocale(code);
          applyDocumentLocale(code);
        }
        const currency = parseCurrencyCode(data?.preferredCurrency ?? null);
        setPreferredCurrencyState(currency);
        persistCurrency(currency);
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

  const setPreferredCurrency = useCallback(
    (code: SupportedCurrency) => {
      setPreferredCurrencyState(code);
      persistCurrency(code);
      if (session?.user) {
        fetch("/api/dashboard/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredCurrency: code }),
        }).catch(() => {});
      }
    },
    [session?.user]
  );

  const messages = useMemo(() => buildMessages(locale), [locale]);
  const def = getLocaleDefinition(locale);

  const value = useMemo<I18nContextValue>(() => {
    const t = createTranslator(locale, messages, englishMessages);

    const formatCurrencyFn = (amountUsd: number, currencyOverride?: string) => {
      const target = parseCurrencyCode(currencyOverride ?? preferredCurrency);
      const converted = convertUsdAmount(amountUsd, target, exchangeRates);
      return formatMoneyDisplay(converted, target, def.bcp47);
    };

    return {
      locale,
      messages,
      dir: def.dir,
      setLocale,
      preferredCurrency,
      currencySymbol: getCurrencySymbol(preferredCurrency),
      exchangeRates,
      ratesLoading,
      setPreferredCurrency,
      t,
      formatCurrency: formatCurrencyFn,
      convertFromUsd: (amountUsd, currencyOverride) =>
        convertUsdAmount(amountUsd, parseCurrencyCode(currencyOverride ?? preferredCurrency), exchangeRates),
      convertToUsd: (amountDisplay, currencyOverride) =>
        convertDisplayToUsd(amountDisplay, parseCurrencyCode(currencyOverride ?? preferredCurrency), exchangeRates),
      formatDate: (date, options) => formatDateLocale(date, locale, options),
      formatTime: (date) => formatTimeLocale(date, locale),
    };
  }, [
    locale,
    messages,
    def,
    setLocale,
    preferredCurrency,
    exchangeRates,
    ratesLoading,
    setPreferredCurrency,
  ]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return createFallbackContext(DEFAULT_LOCALE);
  }
  return ctx;
}

/** @deprecated Use useI18n().formatCurrency for user-facing amounts stored in USD. */
export function useCurrency() {
  const { preferredCurrency, currencySymbol, exchangeRates, ratesLoading, setPreferredCurrency, formatCurrency, convertFromUsd: convertUsd, convertToUsd: convertDisplayToUsd } = useI18n();
  return {
    currency: preferredCurrency,
    currencySymbol,
    rates: exchangeRates,
    ratesLoading,
    setCurrency: setPreferredCurrency,
    formatMoney: formatCurrency,
    convertFromUsd: convertUsd,
    convertToUsd: convertDisplayToUsd,
  };
}
