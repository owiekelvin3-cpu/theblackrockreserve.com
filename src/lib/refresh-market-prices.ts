import { prisma } from "@/lib/prisma";
import { fetchLiveQuotes, isPublicMarketSymbol } from "@/lib/market-quotes";

const STALE_MS = 10 * 60 * 1000;
let refreshPromise: Promise<{ updated: number; skipped: number; failed: string[] }> | null = null;

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function refreshMarketAssetPrices(force = false) {
  const assets = await prisma.marketAsset.findMany({
    where: { enabled: true },
    select: { symbol: true, price: true, changePercent: true, updatedAt: true },
  });

  const publicAssets = assets.filter((asset) => isPublicMarketSymbol(asset.symbol));
  if (publicAssets.length === 0) return { updated: 0, skipped: 0, failed: [] as string[] };

  if (!force) {
    const oldest = publicAssets.reduce((earliest, asset) => Math.min(earliest, asset.updatedAt.getTime()), Date.now());
    if (Date.now() - oldest < STALE_MS) {
      return { updated: 0, skipped: publicAssets.length, failed: [] as string[] };
    }
  }

  const quotes = await fetchLiveQuotes(publicAssets.map((asset) => asset.symbol));
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const failed = publicAssets.filter((asset) => !quoteBySymbol.has(asset.symbol)).map((asset) => asset.symbol);

  let updated = 0;
  for (const asset of publicAssets) {
    const quote = quoteBySymbol.get(asset.symbol);
    if (!quote) continue;
    if (roundMoney(Number(asset.price)) === quote.price && roundMoney(Number(asset.changePercent)) === quote.changePercent) {
      await prisma.marketAsset.update({
        where: { symbol: asset.symbol },
        data: { updatedAt: new Date() },
      });
      continue;
    }

    await prisma.marketAsset.update({
      where: { symbol: asset.symbol },
      data: {
        price: quote.price,
        changePercent: quote.changePercent,
      },
    });
    updated += 1;
  }

  return { updated, skipped: publicAssets.length - quotes.length, failed };
}

export async function refreshMarketAssetPricesIfStale() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshMarketAssetPrices(false).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
