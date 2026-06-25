import { prisma } from "@/lib/prisma";
import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currency/constants";
import {
  FALLBACK_RATES,
  normalizeRates,
  type ExchangeRates,
} from "@/lib/currency/convert";

const EXCHANGE_RATES_KEY = "exchange_rates_usd";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type CachedRatesPayload = {
  rates: ExchangeRates;
  fetchedAt: string;
};

let memoryCache: { rates: ExchangeRates; fetchedAt: number } | null = null;

function pickSupportedRates(allRates: ExchangeRates): ExchangeRates {
  const picked: ExchangeRates = { [BASE_CURRENCY]: 1 };
  for (const code of SUPPORTED_CURRENCIES) {
    if (code === BASE_CURRENCY) continue;
    const rate = allRates[code];
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      picked[code] = rate;
    } else if (FALLBACK_RATES[code]) {
      picked[code] = FALLBACK_RATES[code];
    }
  }
  return normalizeRates(picked);
}

async function readCachedFromDb(): Promise<CachedRatesPayload | null> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: EXCHANGE_RATES_KEY },
    });
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as CachedRatesPayload;
    if (!parsed?.rates || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCachedToDb(rates: ExchangeRates): Promise<void> {
  const payload: CachedRatesPayload = {
    rates: pickSupportedRates(rates),
    fetchedAt: new Date().toISOString(),
  };
  try {
    await prisma.platformSetting.upsert({
      where: { key: EXCHANGE_RATES_KEY },
      create: { key: EXCHANGE_RATES_KEY, value: JSON.stringify(payload) },
      update: { value: JSON.stringify(payload) },
    });
  } catch (error) {
    console.error("Failed to cache exchange rates:", error);
  }
}

async function fetchLiveRates(): Promise<ExchangeRates> {
  const targets = SUPPORTED_CURRENCIES.filter((c) => c !== BASE_CURRENCY).join(",");
  const url = `https://api.frankfurter.app/latest?from=${BASE_CURRENCY}&to=${targets}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

  const data = (await res.json()) as { rates?: ExchangeRates };
  if (!data.rates) throw new Error("Invalid exchange rate response");

  const merged = { ...FALLBACK_RATES, ...data.rates, [BASE_CURRENCY]: 1 };
  return pickSupportedRates(merged);
}

function isCacheFresh(fetchedAt: string | number): boolean {
  const ts = typeof fetchedAt === "number" ? fetchedAt : new Date(fetchedAt).getTime();
  return Date.now() - ts < CACHE_TTL_MS;
}

export async function getExchangeRates(forceRefresh = false): Promise<{
  rates: ExchangeRates;
  fetchedAt: string;
  stale: boolean;
}> {
  if (!forceRefresh && memoryCache && isCacheFresh(memoryCache.fetchedAt)) {
    return {
      rates: memoryCache.rates,
      fetchedAt: new Date(memoryCache.fetchedAt).toISOString(),
      stale: false,
    };
  }

  const dbCache = await readCachedFromDb();
  if (!forceRefresh && dbCache && isCacheFresh(dbCache.fetchedAt)) {
    const rates = pickSupportedRates(dbCache.rates);
    memoryCache = { rates, fetchedAt: new Date(dbCache.fetchedAt).getTime() };
    return { rates, fetchedAt: dbCache.fetchedAt, stale: false };
  }

  try {
    const live = await fetchLiveRates();
    const fetchedAt = new Date().toISOString();
    memoryCache = { rates: live, fetchedAt: Date.now() };
    await writeCachedToDb(live);
    return { rates: live, fetchedAt, stale: false };
  } catch (error) {
    console.error("Exchange rate fetch failed, using cache:", error);
    if (dbCache) {
      const rates = pickSupportedRates(dbCache.rates);
      memoryCache = { rates, fetchedAt: new Date(dbCache.fetchedAt).getTime() };
      return { rates, fetchedAt: dbCache.fetchedAt, stale: true };
    }
    memoryCache = { rates: pickSupportedRates(FALLBACK_RATES), fetchedAt: Date.now() };
    return {
      rates: pickSupportedRates(FALLBACK_RATES),
      fetchedAt: new Date().toISOString(),
      stale: true,
    };
  }
}

export async function formatMoneyForUser(
  amountUsd: number,
  preferredCurrency: string | null | undefined,
  locale?: string
): Promise<string> {
  const { parseCurrencyCode } = await import("@/lib/currency/constants");
  const { convertFromUsd } = await import("@/lib/currency/convert");
  const { formatMoneyDisplay } = await import("@/lib/currency/format");

  const currency = parseCurrencyCode(preferredCurrency) as SupportedCurrency;
  const { rates } = await getExchangeRates();
  const converted = convertFromUsd(amountUsd, currency, rates);
  return formatMoneyDisplay(converted, currency, locale);
}
