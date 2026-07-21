export const STANDARD_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CNY",
  "AED",
] as const;

/** Extra display currencies unlocked for Gold verified members. */
export const GOLD_EXTENDED_CURRENCIES = ["NGN"] as const;

export const SUPPORTED_CURRENCIES = [
  ...STANDARD_CURRENCIES,
  ...GOLD_EXTENDED_CURRENCIES,
] as const;

export type StandardCurrency = (typeof STANDARD_CURRENCIES)[number];
export type GoldExtendedCurrency = (typeof GOLD_EXTENDED_CURRENCIES)[number];
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
  NGN: { code: "NGN", name: "Nigerian Naira", symbol: "₦", decimals: 2, bcp47: "en-NG" },
};

function toCurrencyOptions(codes: readonly SupportedCurrency[]) {
  return codes.map((code) => {
    const meta = CURRENCY_META[code];
    return {
      ...meta,
      label: `${code} – ${meta.name} (${meta.symbol})`,
    };
  });
}

export const STANDARD_CURRENCY_OPTIONS = toCurrencyOptions(STANDARD_CURRENCIES);

/** @deprecated Prefer getCurrencyOptionsForBadge for user-facing selectors. */
export const CURRENCY_OPTIONS = toCurrencyOptions(SUPPORTED_CURRENCIES);

export function getCurrencyCodesForBadge(
  verificationBadge: string | null | undefined
): SupportedCurrency[] {
  if (verificationBadge === "GOLD") {
    return [...STANDARD_CURRENCIES, ...GOLD_EXTENDED_CURRENCIES];
  }
  return [...STANDARD_CURRENCIES];
}

export function getCurrencyOptionsForBadge(verificationBadge: string | null | undefined) {
  return toCurrencyOptions(getCurrencyCodesForBadge(verificationBadge));
}

export function isGoldExtendedCurrency(value: string | null | undefined): value is GoldExtendedCurrency {
  return !!value && (GOLD_EXTENDED_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function isCurrencyAllowedForBadge(
  currency: string | null | undefined,
  verificationBadge: string | null | undefined
): boolean {
  const code = currency?.toUpperCase();
  if (!code || !(SUPPORTED_CURRENCIES as readonly string[]).includes(code)) return false;
  if (isGoldExtendedCurrency(code)) return verificationBadge === "GOLD";
  return (STANDARD_CURRENCIES as readonly string[]).includes(code);
}

export function isSupportedCurrency(value: string | null | undefined): value is SupportedCurrency {
  return !!value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

export function parseCurrencyCode(value: string | null | undefined): SupportedCurrency {
  const upper = value?.toUpperCase();
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY;
}
