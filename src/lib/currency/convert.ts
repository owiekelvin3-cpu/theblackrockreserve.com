import {
  BASE_CURRENCY,
  type SupportedCurrency,
  parseCurrencyCode,
} from "@/lib/currency/constants";

export type ExchangeRates = Record<string, number>;

export function normalizeRates(rates: ExchangeRates): ExchangeRates {
  return { [BASE_CURRENCY]: 1, ...rates };
}

export function getRate(
  rates: ExchangeRates,
  currency: SupportedCurrency
): number {
  if (currency === BASE_CURRENCY) return 1;
  const rate = rates[currency];
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) return rate;
  return 1;
}

/** Convert an amount stored in USD to the target display currency. */
export function convertFromUsd(
  amountUsd: number,
  targetCurrency: SupportedCurrency,
  rates: ExchangeRates
): number {
  if (!Number.isFinite(amountUsd)) return 0;
  const rate = getRate(rates, targetCurrency);
  const converted = amountUsd * rate;
  return roundForCurrency(converted, targetCurrency);
}

/** Convert a user-entered display amount back to USD for storage. */
export function convertToUsd(
  amountDisplay: number,
  sourceCurrency: SupportedCurrency,
  rates: ExchangeRates
): number {
  if (!Number.isFinite(amountDisplay)) return 0;
  if (sourceCurrency === BASE_CURRENCY) return roundUsd(amountDisplay);
  const rate = getRate(rates, sourceCurrency);
  if (rate <= 0) return roundUsd(amountDisplay);
  return roundUsd(amountDisplay / rate);
}

export function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function roundForCurrency(amount: number, currency: SupportedCurrency): number {
  const decimals = currency === "JPY" ? 0 : 2;
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

export function convertBetween(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined,
  rates: ExchangeRates
): number {
  const fromCurrency = parseCurrencyCode(from);
  const toCurrency = parseCurrencyCode(to);
  const usd = convertToUsd(amount, fromCurrency, rates);
  return convertFromUsd(usd, toCurrency, rates);
}

export const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149,
  CAD: 1.36,
  AUD: 1.52,
  CNY: 7.24,
  AED: 3.67,
  NGN: 1550,
};
