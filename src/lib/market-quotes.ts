export type LiveQuote = {
  symbol: string;
  price: number;
  changePercent: number;
};

const CUSTOM_SYMBOLS = new Set(["BR"]);
const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function roundPercent(n: number) {
  return Math.round(n * 10000) / 10000;
}

function yahooSymbol(symbol: string) {
  return symbol.replace(/\./g, "-");
}

export function isPublicMarketSymbol(symbol: string) {
  return !CUSTOM_SYMBOLS.has(symbol.trim().toUpperCase());
}

async function fetchYahooChart(symbol: string): Promise<LiveQuote | null> {
  const ticker = yahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": YAHOO_UA,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; regularMarketChangePercent?: number; chartPreviousClose?: number };
        }>;
      };
    };
    const meta = json.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;

    let changePercent = Number(meta?.regularMarketChangePercent);
    if (!Number.isFinite(changePercent)) {
      const prev = Number(meta?.chartPreviousClose);
      changePercent = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    }

    return {
      symbol: symbol.toUpperCase(),
      price: roundMoney(price),
      changePercent: roundPercent(changePercent),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function fetchLiveQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const unique = Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter((symbol) => symbol && isPublicMarketSymbol(symbol)))
  );
  if (unique.length === 0) return [];

  const quotes = await mapPool(unique, 6, fetchYahooChart);
  return quotes.filter((quote): quote is LiveQuote => quote != null);
}
