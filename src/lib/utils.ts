import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { formatMoneyDisplay } from "@/lib/currency/format";
import { parseCurrencyCode } from "@/lib/currency/constants";

export function formatCurrency(amount: number, currency = "USD"): string {
  return formatMoneyDisplay(amount, parseCurrencyCode(currency));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
