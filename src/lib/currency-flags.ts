const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  JPY: "🇯🇵",
  CNY: "🇨🇳",
  AED: "🇦🇪",
  NGN: "🇳🇬",
};

export function currencyFlag(currency: string) {
  return CURRENCY_FLAGS[currency.toUpperCase()] ?? "💱";
}
