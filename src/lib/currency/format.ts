import {
  CURRENCY_META,
  DEFAULT_CURRENCY,
  parseCurrencyCode,
  type SupportedCurrency,
} from "@/lib/currency/constants";
import { convertFromUsd } from "@/lib/currency/convert";

export function getCurrencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_META[currency].symbol;
}

/** Short badge shown in selectors and balance tiles (₦ instead of NGN). */
export function getCurrencyDisplayBadge(currency: string | SupportedCurrency): string {
  const code = parseCurrencyCode(typeof currency === "string" ? currency : currency);
  if (code === "NGN") return CURRENCY_META.NGN.symbol;
  return code;
}

export function formatMoneyDisplay(
  amount: number,
  currency: string | SupportedCurrency = DEFAULT_CURRENCY,
  locale?: string
): string {
  const code = parseCurrencyCode(typeof currency === "string" ? currency : currency);
  const meta = CURRENCY_META[code];
  const bcp47 = locale ?? meta.bcp47;

  try {
    return new Intl.NumberFormat(bcp47, {
      style: "currency",
      currency: code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(amount);
  } catch {
    return `${meta.symbol}${amount.toFixed(meta.decimals)}`;
  }
}

export function formatMoneyFromUsd(
  amountUsd: number,
  targetCurrency: string,
  rates: Record<string, number>,
  locale?: string
): string {
  const code = parseCurrencyCode(targetCurrency);
  const converted = convertFromUsd(amountUsd, code, rates);
  return formatMoneyDisplay(converted, code, locale);
}
