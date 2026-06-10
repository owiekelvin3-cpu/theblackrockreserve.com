import { prisma } from "@/lib/prisma";
import { getAccounts, getInvestments } from "@/lib/dashboard-data";
import { getMarketAssets, getMarketStatus, type MarketAssetDto } from "@/lib/market-assets";

export interface EnrichedHolding {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  avgPrice: number;
  costBasis: number;
  marketPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChangePercent: number;
  roiPercent: number;
  investedAt: string;
}

export interface InvestmentHistoryItem {
  id: string;
  symbol: string;
  assetName: string;
  amountUsd: number;
  shares: number;
  priceAtPurchase: number;
  fee: number;
  totalCost: number;
  status: string;
  createdAt: string;
}

export interface PortfolioAnalytics {
  totalInvested: number;
  currentPortfolioValue: number;
  totalProfit: number;
  totalLoss: number;
  netGainLoss: number;
  netGainLossPercent: number;
  monthlyGrowth: { month: string; invested: number; value: number }[];
  assetAllocation: { sector: string; value: number; percent: number }[];
  portfolioDistribution: { symbol: string; name: string; value: number; percent: number }[];
}

export async function getCapitalMarketsData(userId: string) {
  const [holdings, accounts, assets, orders] = await Promise.all([
    getInvestments(userId),
    getAccounts(userId),
    getMarketAssets(),
    prisma.investmentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const assetMap = new Map(assets.map((a) => [a.symbol, a]));

  const enrichedHoldings: EnrichedHolding[] = holdings.map((h) => {
    const quote = assetMap.get(h.symbol);
    const marketPrice = quote?.price ?? h.avgPrice;
    const marketValue = h.shares * marketPrice;
    const costBasis = h.shares * h.avgPrice;
    const gainLoss = marketValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    const firstOrder = orders.find((o) => o.symbol === h.symbol);

    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      sector: quote?.sector ?? "Equity",
      shares: h.shares,
      avgPrice: h.avgPrice,
      costBasis,
      marketPrice,
      marketValue,
      gainLoss,
      gainLossPercent,
      dayChangePercent: quote?.changePercent ?? 0,
      roiPercent: gainLossPercent,
      investedAt: firstOrder?.createdAt.toISOString() ?? new Date().toISOString(),
    };
  });

  const portfolioValue = enrichedHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
  const netGainLoss = portfolioValue - totalInvested;
  const netGainLossPercent = totalInvested > 0 ? (netGainLoss / totalInvested) * 100 : 0;

  const profits = enrichedHoldings.filter((h) => h.gainLoss > 0);
  const losses = enrichedHoldings.filter((h) => h.gainLoss < 0);
  const totalProfit = profits.reduce((sum, h) => sum + h.gainLoss, 0);
  const totalLoss = Math.abs(losses.reduce((sum, h) => sum + h.gainLoss, 0));

  const dayChange = enrichedHoldings.reduce(
    (sum, h) => sum + h.marketValue * (h.dayChangePercent / 100),
    0
  );
  const dayChangePercent = portfolioValue > 0 ? (dayChange / portfolioValue) * 100 : 0;
  const availableCash = accounts.reduce((sum, a) => sum + a.balance, 0);

  const sectorTotals: Record<string, number> = {};
  for (const h of enrichedHoldings) {
    sectorTotals[h.sector] = (sectorTotals[h.sector] ?? 0) + h.marketValue;
  }
  const assetAllocation = Object.entries(sectorTotals)
    .map(([sector, value]) => ({
      sector,
      value: Math.round(value * 100) / 100,
      percent: portfolioValue > 0 ? Math.round((value / portfolioValue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const portfolioDistribution = enrichedHoldings
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      value: Math.round(h.marketValue * 100) / 100,
      percent: portfolioValue > 0 ? Math.round((h.marketValue / portfolioValue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const monthlyGrowth = buildMonthlyGrowth(orders, enrichedHoldings);

  const history: InvestmentHistoryItem[] = orders.map((o) => ({
    id: o.id,
    symbol: o.symbol,
    assetName: o.assetName,
    amountUsd: Number(o.amountUsd),
    shares: Number(o.shares),
    priceAtPurchase: Number(o.priceAtPurchase),
    fee: Number(o.fee),
    totalCost: Number(o.totalCost),
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  const analytics: PortfolioAnalytics = {
    totalInvested: Math.round(totalInvested * 100) / 100,
    currentPortfolioValue: Math.round(portfolioValue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalLoss: Math.round(totalLoss * 100) / 100,
    netGainLoss: Math.round(netGainLoss * 100) / 100,
    netGainLossPercent: Math.round(netGainLossPercent * 100) / 100,
    monthlyGrowth,
    assetAllocation,
    portfolioDistribution,
  };

  return {
    portfolioValue,
    dayChange,
    dayChangePercent,
    positionsCount: enrichedHoldings.length,
    availableCash,
    marketStatus: getMarketStatus(),
    holdings: enrichedHoldings,
    assets: assets as MarketAssetDto[],
    history,
    analytics,
    primaryAccountId: accounts.find((a) => a.type === "checking")?.id ?? accounts[0]?.id ?? null,
  };
}

function buildMonthlyGrowth(
  orders: { createdAt: Date; amountUsd: { toString(): string }; symbol: string }[],
  holdings: EnrichedHolding[]
) {
  const months: { month: string; invested: number; value: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const invested = orders
      .filter((o) => o.createdAt <= endOfMonth)
      .reduce((sum, o) => sum + Number(o.amountUsd), 0);

    const growthFactor = 1 + (holdings.length > 0 ? 0.02 * (5 - i) : 0);
    const value = invested * growthFactor;

    months.push({
      month: label,
      invested: Math.round(invested),
      value: Math.round(value),
    });
  }

  return months;
}
