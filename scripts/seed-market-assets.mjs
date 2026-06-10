/**
 * Seed Capital Markets assets into MarketAsset table.
 * Usage: node scripts/seed-market-assets.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seeds = [
  ["AAPL", "Apple Inc.", "Technology", "apple.com", 198.42, 1.24, 100, "Medium", 9.5, 1, 98],
  ["MSFT", "Microsoft Corporation", "Technology", "microsoft.com", 428.15, 0.87, 100, "Low", 10.2, 2, 96],
  ["NVDA", "NVIDIA Corporation", "Technology", "nvidia.com", 132.65, 2.41, 100, "High", 14.8, 3, 99],
  ["AMZN", "Amazon.com Inc.", "Technology", "amazon.com", 198.87, -0.32, 100, "Medium", 11.0, 4, 94],
  ["GOOGL", "Alphabet Inc. Class A", "Technology", "google.com", 178.52, 0.55, 100, "Medium", 10.5, 5, 92],
  ["GOOG", "Alphabet Inc. Class C", "Technology", "google.com", 179.88, 0.61, 100, "Medium", 10.5, 6, 78],
  ["META", "Meta Platforms Inc.", "Technology", "meta.com", 612.34, 1.12, 100, "Medium", 12.3, 7, 90],
  ["TSLA", "Tesla Inc.", "Technology", "tesla.com", 248.91, -1.85, 100, "High", 15.2, 8, 97],
  ["DIS", "The Walt Disney Company", "Entertainment", "disney.com", 112.34, 0.88, 50, "Medium", 8.2, 49, 82],
];

async function main() {
  console.log("Seeding market assets…");
  let count = 0;
  for (const [symbol, name, sector, logoDomain, price, changePercent, minInvestment, riskRating, expectedReturnPercent, marketCapRank, popularity] of seeds) {
    await prisma.marketAsset.upsert({
      where: { symbol },
      create: {
        symbol,
        name,
        sector,
        description: `${name} — listed equity security available on the Capital Markets platform.`,
        logoDomain,
        price,
        changePercent,
        minInvestment,
        riskRating,
        expectedReturnPercent,
        marketCapRank,
        popularity,
        enabled: true,
      },
      update: { price, changePercent, enabled: true },
    });
    count++;
  }
  console.log(`Done. Upserted ${count} sample assets. Full catalog seeds on first API request via ensureMarketAssetsSeeded().`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
