import { getLocaleDefinition, type LocaleCode } from "@/lib/i18n/locales";
import { parseCurrencyCode, CURRENCY_META } from "@/lib/currency/constants";

export function formatCurrencyLocale(
  amount: number,
  locale: LocaleCode,
  currency = "USD"
): string {
  const { bcp47 } = getLocaleDefinition(locale);
  const code = parseCurrencyCode(currency);
  const meta = CURRENCY_META[code];
  return new Intl.NumberFormat(bcp47, {
    style: "currency",
    currency: code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(amount);
}

export function formatDateLocale(
  date: Date | string,
  locale: LocaleCode,
  options?: Intl.DateTimeFormatOptions
): string {
  const { bcp47 } = getLocaleDefinition(locale);
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(bcp47, options ?? { dateStyle: "medium" }).format(d);
}

export function formatTimeLocale(date: Date | string, locale: LocaleCode): string {
  const { bcp47 } = getLocaleDefinition(locale);
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(bcp47, { timeStyle: "short" }).format(d);
}
