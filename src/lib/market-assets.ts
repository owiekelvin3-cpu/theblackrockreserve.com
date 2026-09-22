import { prisma } from "@/lib/prisma";
import { mapMarketAsset, type MarketAssetRecord } from "@/lib/market-asset-mapper";
import { refreshMarketAssetPricesIfStale } from "@/lib/refresh-market-prices";

export type MarketAssetDto = MarketAssetRecord;

type AssetSeed = {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  logoDomain: string;
  price: number;
  changePercent: number;
  minInvestment: number;
  riskRating: "Low" | "Medium" | "High";
  expectedReturnPercent: number;
  marketCapRank: number;
  popularity: number;
};

const MARKET_ASSET_SEEDS: AssetSeed[] = [
  // Technology
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", logoDomain: "apple.com", price: 338.98, changePercent: 0.848, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 9.5, marketCapRank: 1, popularity: 98, description: "Apple designs and manufactures consumer electronics, software, and services including iPhone, Mac, and Apple Services." },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology", logoDomain: "microsoft.com", price: 501.61, changePercent: 1.586, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 10.2, marketCapRank: 2, popularity: 96, description: "Microsoft develops cloud computing, productivity software, gaming, and enterprise solutions through Azure, Office, and Windows." },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology", logoDomain: "nvidia.com", price: 227.38, changePercent: 2.299, minInvestment: 100, riskRating: "High", expectedReturnPercent: 14.8, marketCapRank: 3, popularity: 99, description: "NVIDIA is a leader in GPU computing, AI accelerators, and data center infrastructure powering modern machine learning workloads." },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Technology", logoDomain: "amazon.com", price: 258.45, changePercent: 1.868, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 11.0, marketCapRank: 4, popularity: 94, description: "Amazon operates global e-commerce, cloud infrastructure (AWS), advertising, and logistics at massive scale." },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", sector: "Technology", logoDomain: "google.com", price: 354.97, changePercent: 1.553, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 10.5, marketCapRank: 5, popularity: 92, description: "Alphabet owns Google Search, YouTube, Android, and Google Cloud — core platforms in digital advertising and AI." },
  { symbol: "GOOG", name: "Alphabet Inc. Class C", sector: "Technology", logoDomain: "google.com", price: 350.87, changePercent: 1.876, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 10.5, marketCapRank: 6, popularity: 78, description: "Class C shares of Alphabet with equivalent economic interest to GOOGL, without voting rights." },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology", logoDomain: "meta.com", price: 741.25, changePercent: 11.428, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 12.3, marketCapRank: 7, popularity: 90, description: "Meta builds social platforms including Facebook, Instagram, and WhatsApp, and invests heavily in AI and the metaverse." },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Technology", logoDomain: "tesla.com", price: 375.3, changePercent: 3.028, minInvestment: 100, riskRating: "High", expectedReturnPercent: 15.2, marketCapRank: 8, popularity: 97, description: "Tesla designs electric vehicles, energy storage, and autonomous driving technology with a vertically integrated model." },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology", logoDomain: "intel.com", price: 121.78, changePercent: 12.136, minInvestment: 50, riskRating: "High", expectedReturnPercent: 6.5, marketCapRank: 45, popularity: 65, description: "Intel manufactures semiconductors and processors for PCs, data centers, and edge computing markets worldwide." },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", logoDomain: "amd.com", price: 615.52, changePercent: 9.95, minInvestment: 100, riskRating: "High", expectedReturnPercent: 13.1, marketCapRank: 22, popularity: 82, description: "AMD designs high-performance CPUs and GPUs for gaming, data centers, and AI inference workloads." },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology", logoDomain: "broadcom.com", price: 362.66, changePercent: 1.597, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 11.8, marketCapRank: 12, popularity: 74, description: "Broadcom supplies semiconductor and infrastructure software solutions for enterprise, cloud, and networking." },
  { symbol: "QCOM", name: "Qualcomm Inc.", sector: "Technology", logoDomain: "qualcomm.com", price: 194.23, changePercent: 9.29, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 9.8, marketCapRank: 28, popularity: 70, description: "Qualcomm develops mobile chipsets, 5G modems, and wireless technology powering smartphones and IoT devices." },
  { symbol: "CSCO", name: "Cisco Systems Inc.", sector: "Technology", logoDomain: "cisco.com", price: 111.46, changePercent: 1.781, minInvestment: 50, riskRating: "Low", expectedReturnPercent: 7.2, marketCapRank: 35, popularity: 68, description: "Cisco provides networking hardware, security, and collaboration solutions for enterprise and service provider networks." },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology", logoDomain: "oracle.com", price: 148.56, changePercent: 0.644, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 8.9, marketCapRank: 18, popularity: 72, description: "Oracle delivers enterprise database, cloud infrastructure, and business application software to global organizations." },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology", logoDomain: "salesforce.com", price: 236.42, changePercent: -0.63, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 10.0, marketCapRank: 24, popularity: 76, description: "Salesforce is the leading CRM platform, offering sales, service, marketing, and analytics cloud applications." },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Technology", logoDomain: "netflix.com", price: 73.36, changePercent: 2.187, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 11.5, marketCapRank: 30, popularity: 88, description: "Netflix is a global streaming entertainment service producing and distributing films, series, and documentaries." },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology", logoDomain: "adobe.com", price: 249.52, changePercent: 0.241, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 9.2, marketCapRank: 32, popularity: 71, description: "Adobe provides creative, document, and experience cloud software including Photoshop, Acrobat, and Experience Manager." },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Technology", logoDomain: "paypal.com", price: 52.62, changePercent: 0.401, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 8.0, marketCapRank: 55, popularity: 80, description: "PayPal operates digital payment platforms enabling online and mobile commerce for consumers and merchants globally." },
  { symbol: "UBER", name: "Uber Technologies Inc.", sector: "Technology", logoDomain: "uber.com", price: 70.84, changePercent: 0.482, minInvestment: 50, riskRating: "High", expectedReturnPercent: 12.0, marketCapRank: 48, popularity: 85, description: "Uber operates ride-hailing, food delivery, and freight logistics platforms across more than 70 countries." },
  { symbol: "ABNB", name: "Airbnb Inc.", sector: "Technology", logoDomain: "airbnb.com", price: 166.84, changePercent: 0.373, minInvestment: 100, riskRating: "High", expectedReturnPercent: 11.2, marketCapRank: 52, popularity: 83, description: "Airbnb operates a global marketplace connecting hosts and guests for short-term lodging and experiences." },
  // Financial Services
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B", sector: "Financial Services", logoDomain: "berkshirehathaway.com", price: 502.01, changePercent: -1.522, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 8.5, marketCapRank: 9, popularity: 86, description: "Berkshire Hathaway is a diversified holding company led by Warren Buffett with interests in insurance, rail, energy, and equities." },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", logoDomain: "jpmorganchase.com", price: 352.04, changePercent: 0.678, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 8.8, marketCapRank: 11, popularity: 84, description: "JPMorgan Chase is the largest U.S. bank by assets, offering investment banking, commercial banking, and asset management." },
  { symbol: "V", name: "Visa Inc.", sector: "Financial Services", logoDomain: "visa.com", price: 369.95, changePercent: 0.451, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 9.0, marketCapRank: 14, popularity: 81, description: "Visa operates the world's largest payment network, facilitating electronic funds transfers globally." },
  { symbol: "MA", name: "Mastercard Inc.", sector: "Financial Services", logoDomain: "mastercard.com", price: 567.65, changePercent: 0.426, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 9.2, marketCapRank: 16, popularity: 79, description: "Mastercard provides payment processing technology connecting financial institutions, merchants, and consumers." },
  { symbol: "GS", name: "Goldman Sachs Group Inc.", sector: "Financial Services", logoDomain: "goldmansachs.com", price: 959.39, changePercent: 1.846, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 8.5, marketCapRank: 38, popularity: 67, description: "Goldman Sachs is a leading global investment bank and financial services firm serving corporations and institutions." },
  { symbol: "MS", name: "Morgan Stanley", sector: "Financial Services", logoDomain: "morganstanley.com", price: 206.12, changePercent: 1.747, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 8.2, marketCapRank: 42, popularity: 64, description: "Morgan Stanley provides investment banking, wealth management, and institutional securities services worldwide." },
  { symbol: "BLK", name: "BlackRock Inc.", sector: "Financial Services", logoDomain: "blackrock.com", price: 1090.27, changePercent: 1.915, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 9.5, marketCapRank: 20, popularity: 73, description: "BlackRock is the world's largest asset manager, known for iShares ETFs and Aladdin risk management technology." },
  { symbol: "AXP", name: "American Express Company", sector: "Financial Services", logoDomain: "americanexpress.com", price: 313.59, changePercent: 0.652, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 8.0, marketCapRank: 40, popularity: 69, description: "American Express provides charge and credit card products, travel services, and payment solutions globally." },
  // Consumer & Retail
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer & Retail", logoDomain: "walmart.com", price: 107.44, changePercent: 0.665, minInvestment: 50, riskRating: "Low", expectedReturnPercent: 7.5, marketCapRank: 15, popularity: 77, description: "Walmart operates the world's largest retail chain with grocery, general merchandise, and e-commerce operations." },
  { symbol: "COST", name: "Costco Wholesale Corporation", sector: "Consumer & Retail", logoDomain: "costco.com", price: 898.48, changePercent: 0.354, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 8.8, marketCapRank: 19, popularity: 75, description: "Costco operates membership warehouse clubs offering bulk goods at competitive prices with high customer loyalty." },
  { symbol: "KO", name: "The Coca-Cola Company", sector: "Consumer & Retail", logoDomain: "coca-cola.com", price: 87.12, changePercent: -1.28, minInvestment: 50, riskRating: "Low", expectedReturnPercent: 6.5, marketCapRank: 36, popularity: 74, description: "Coca-Cola manufactures and markets non-alcoholic beverage concentrates and syrups across 200+ countries." },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer & Retail", logoDomain: "pepsico.com", price: 129.59, changePercent: -0.123, minInvestment: 50, riskRating: "Low", expectedReturnPercent: 6.8, marketCapRank: 37, popularity: 72, description: "PepsiCo is a global food and beverage leader with brands including Pepsi, Frito-Lay, Gatorade, and Quaker." },
  { symbol: "MCD", name: "McDonald's Corporation", sector: "Consumer & Retail", logoDomain: "mcdonalds.com", price: 247.88, changePercent: -0.145, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 7.2, marketCapRank: 33, popularity: 78, description: "McDonald's operates the world's largest fast-food restaurant chain with franchise and company-owned locations." },
  { symbol: "SBUX", name: "Starbucks Corporation", sector: "Consumer & Retail", logoDomain: "starbucks.com", price: 94.9, changePercent: -0.97, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 7.8, marketCapRank: 50, popularity: 76, description: "Starbucks is the premier roaster and retailer of specialty coffee with a global store network and loyalty program." },
  { symbol: "NKE", name: "Nike Inc.", sector: "Consumer & Retail", logoDomain: "nike.com", price: 36.1, changePercent: 1.661, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 8.5, marketCapRank: 44, popularity: 80, description: "Nike designs, markets, and sells athletic footwear, apparel, and equipment under the Nike and Jordan brands." },
  { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer & Retail", logoDomain: "pg.com", price: 146.08, changePercent: -0.212, minInvestment: 50, riskRating: "Low", expectedReturnPercent: 6.2, marketCapRank: 26, popularity: 70, description: "P&G is a consumer goods giant with brands including Tide, Pampers, Gillette, and Crest across 180 countries." },
  // Healthcare
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", logoDomain: "jnj.com", price: 269.47, changePercent: -0.193, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 6.8, marketCapRank: 21, popularity: 71, description: "Johnson & Johnson develops pharmaceuticals, medical devices, and consumer health products globally." },
  { symbol: "LLY", name: "Eli Lilly and Company", sector: "Healthcare", logoDomain: "lilly.com", price: 1164.89, changePercent: 1.037, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 12.5, marketCapRank: 10, popularity: 87, description: "Eli Lilly discovers and manufactures medicines in diabetes, oncology, immunology, and neuroscience." },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", logoDomain: "pfizer.com", price: 27.74, changePercent: 0.289, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 5.5, marketCapRank: 58, popularity: 66, description: "Pfizer is a global biopharmaceutical company developing vaccines and therapeutics across multiple disease areas." },
  { symbol: "MRK", name: "Merck & Co. Inc.", sector: "Healthcare", logoDomain: "merck.com", price: 149.5, changePercent: 1.791, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 7.5, marketCapRank: 46, popularity: 68, description: "Merck is a global healthcare company focused on prescription medicines, vaccines, and animal health products." },
  { symbol: "ABT", name: "Abbott Laboratories", sector: "Healthcare", logoDomain: "abbott.com", price: 102.98, changePercent: 0.361, minInvestment: 100, riskRating: "Low", expectedReturnPercent: 7.0, marketCapRank: 47, popularity: 65, description: "Abbott develops diagnostics, medical devices, nutritionals, and branded generic pharmaceuticals worldwide." },
  // Energy
  { symbol: "XOM", name: "Exxon Mobil Corporation", sector: "Energy", logoDomain: "exxonmobil.com", price: 158.3, changePercent: -3.204, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 7.0, marketCapRank: 17, popularity: 74, description: "ExxonMobil explores, produces, and refines oil and natural gas with operations across the energy value chain." },
  { symbol: "CVX", name: "Chevron Corporation", sector: "Energy", logoDomain: "chevron.com", price: 203.67, changePercent: -2.787, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 7.2, marketCapRank: 23, popularity: 72, description: "Chevron is an integrated energy company engaged in exploration, production, refining, and chemicals." },
  { symbol: "SHEL", name: "Shell plc", sector: "Energy", logoDomain: "shell.com", price: 93.27, changePercent: -1.343, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 6.8, marketCapRank: 34, popularity: 68, description: "Shell is a global energy company producing oil, gas, and renewable energy with downstream retail operations." },
  { symbol: "BP", name: "BP p.l.c.", sector: "Energy", logoDomain: "bp.com", price: 43.16, changePercent: -3.185, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 6.5, marketCapRank: 56, popularity: 62, description: "BP explores and produces oil and gas while investing in renewables and the energy transition." },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy", logoDomain: "conocophillips.com", price: 127.53, changePercent: -3.262, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 7.5, marketCapRank: 41, popularity: 64, description: "ConocoPhillips is an independent exploration and production company with assets across North America and globally." },
  // Industrial
  { symbol: "BA", name: "The Boeing Company", sector: "Industrial", logoDomain: "boeing.com", price: 201.15, changePercent: 1.488, minInvestment: 100, riskRating: "High", expectedReturnPercent: 9.0, marketCapRank: 43, popularity: 73, description: "Boeing designs and manufactures commercial jetliners, defense systems, and space technology." },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrial", logoDomain: "caterpillar.com", price: 816.5, changePercent: 0.928, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 8.0, marketCapRank: 39, popularity: 66, description: "Caterpillar manufactures construction and mining equipment, diesel engines, and industrial turbines." },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrial", logoDomain: "ge.com", price: 319.01, changePercent: 1.508, minInvestment: 100, riskRating: "Medium", expectedReturnPercent: 8.5, marketCapRank: 31, popularity: 70, description: "GE Aerospace designs and services jet engines and aviation systems for commercial and military aircraft." },
  // Entertainment
  { symbol: "DIS", name: "The Walt Disney Company", sector: "Entertainment", logoDomain: "disney.com", price: 104.23, changePercent: 1.519, minInvestment: 50, riskRating: "Medium", expectedReturnPercent: 8.2, marketCapRank: 49, popularity: 82, description: "Disney operates theme parks, film studios, streaming (Disney+), and media networks including ESPN and ABC." },
];

let seedPromise: Promise<void> | null = null;

const MARKET_ASSET_ORDER = [
  { isPinned: "desc" as const },
  { sortOrder: "asc" as const },
  { marketCapRank: "asc" as const },
  { symbol: "asc" as const },
];

export async function ensureMarketAssetsSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await prisma.marketAsset.count();
      if (count >= MARKET_ASSET_SEEDS.length) return;

      for (const seed of MARKET_ASSET_SEEDS) {
        await prisma.marketAsset.upsert({
          where: { symbol: seed.symbol },
          create: {
            symbol: seed.symbol,
            name: seed.name,
            sector: seed.sector,
            description: seed.description,
            logoDomain: seed.logoDomain,
            price: seed.price,
            changePercent: seed.changePercent,
            minInvestment: seed.minInvestment,
            riskRating: seed.riskRating,
            expectedReturnPercent: seed.expectedReturnPercent,
            marketCapRank: seed.marketCapRank,
            popularity: seed.popularity,
            enabled: true,
          },
          update: {
            name: seed.name,
            sector: seed.sector,
            description: seed.description,
            logoDomain: seed.logoDomain,
            price: seed.price,
            changePercent: seed.changePercent,
            minInvestment: seed.minInvestment,
            riskRating: seed.riskRating,
            expectedReturnPercent: seed.expectedReturnPercent,
            marketCapRank: seed.marketCapRank,
            popularity: seed.popularity,
          },
        });
      }
    })();
  }
  await seedPromise;
}

export async function getMarketAssets(includeDisabled = false): Promise<MarketAssetDto[]> {
  await ensureMarketAssetsSeeded();
  await refreshMarketAssetPricesIfStale().catch((error) =>
    console.error("Market price refresh error:", error)
  );

  const assets = await prisma.marketAsset.findMany({
    where: includeDisabled ? undefined : { enabled: true },
    orderBy: MARKET_ASSET_ORDER,
  });

  return assets.map(mapMarketAsset);
}

export async function getMarketAssetBySymbol(symbol: string): Promise<MarketAssetDto | null> {
  await ensureMarketAssetsSeeded();
  await refreshMarketAssetPricesIfStale().catch((error) =>
    console.error("Market price refresh error:", error)
  );

  const asset = await prisma.marketAsset.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!asset || !asset.enabled) return null;
  return mapMarketAsset(asset);
}

export type MarketStatus = "OPEN" | "CLOSED" | "PRE_MARKET" | "AFTER_HOURS";

export function getMarketStatus(): { status: MarketStatus; label: string; exchanges: string[] } {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const minutes = et.getHours() * 60 + et.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const preMarketStart = 4 * 60;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  const afterHoursEnd = 20 * 60;

  let status: MarketStatus = "CLOSED";
  if (isWeekday) {
    if (minutes >= marketOpen && minutes < marketClose) status = "OPEN";
    else if (minutes >= preMarketStart && minutes < marketOpen) status = "PRE_MARKET";
    else if (minutes >= marketClose && minutes < afterHoursEnd) status = "AFTER_HOURS";
  }

  const labels: Record<MarketStatus, string> = {
    OPEN: "Market Open",
    CLOSED: "Market Closed",
    PRE_MARKET: "Pre-Market",
    AFTER_HOURS: "After Hours",
  };

  return { status, label: labels[status], exchanges: ["NYSE", "NASDAQ"] };
}

export const SECTOR_FILTERS = [
  { id: "all", label: "All Sectors" },
  { id: "Technology", label: "Technology" },
  { id: "Financial Services", label: "Finance" },
  { id: "Healthcare", label: "Healthcare" },
  { id: "Energy", label: "Energy" },
  { id: "Consumer & Retail", label: "Consumer" },
  { id: "Industrial", label: "Industrial" },
  { id: "Entertainment", label: "Entertainment" },
] as const;

export const INVESTMENT_FEE_RATE = 0.0025;
export const MIN_INVESTMENT_FEE = 0.5;

export function calculateInvestmentFee(amount: number): number {
  const fee = Math.max(MIN_INVESTMENT_FEE, Math.round(amount * INVESTMENT_FEE_RATE * 100) / 100);
  return fee;
}
