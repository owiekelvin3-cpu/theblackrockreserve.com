export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CNY",
  "AED",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "USD";
export const BASE_CURRENCY: SupportedCurrency = "USD";

export const CURRENCY_COOKIE = "br-currency";
export const CURRENCY_STORAGE_KEY = "br-currency";

export type CurrencyMeta = {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  decimals: number;
  bcp47: string;
};

export const CURRENCY_META: Record<SupportedCurrency, CurrencyMeta> = {
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, bcp47: "en-US" },
  EUR: { code: "EUR", name: "Euro", symbol: "€", decimals: 2, bcp47: "de-DE" },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", decimals: 2, bcp47: "en-GB" },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0, bcp47: "ja-JP" },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimals: 2, bcp47: "en-CA" },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2, bcp47: "en-AU" },
  CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥", decimals: 2, bcp47: "zh-CN" },
  AED: { code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2, bcp47: "ar-AE" },
};

export const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((code) => ({
  ...CURRENCY_META[code],
  label: `${code} – ${CURRENCY_META[code].name} (${CURRENCY_META[code].symbol})`,
}));

export function isSupportedCurrency(value: string | null | undefined): value is SupportedCurrency {
  return !!value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function parseCurrencyCode(value: string | null | undefined): SupportedCurrency {
  const upper = value?.toUpperCase();
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY;
}
