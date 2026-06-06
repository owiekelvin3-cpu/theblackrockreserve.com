import { getAccounts, getInvestments } from "@/lib/dashboard-data";

export interface MarketQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
}

/** Curated equity watchlist — representative global large-cap names */
export const MARKET_WATCHLIST: MarketQuote[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 214.29, change: 2.41, changePercent: 1.14 },
  { symbol: "MSFT", name: "Microsoft Corp.", sector: "Technology", price: 442.78, change: -1.22, changePercent: -0.27 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 128.44, change: 4.87, changePercent: 3.94 },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", price: 218.56, change: 0.98, changePercent: 0.45 },
  { symbol: "V", name: "Visa Inc.", sector: "Financials", price: 312.15, change: 1.34, changePercent: 0.43 },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", price: 156.82, change: -0.54, changePercent: -0.34 },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 118.93, change: 1.76, changePercent: 1.5 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "Index ETF", price: 589.42, change: 2.18, changePercent: 0.37 },
];

function quoteForSymbol(symbol: string): MarketQuote | undefined {
  return MARKET_WATCHLIST.find((q) => q.symbol === symbol);
}

export async function getCapitalMarketsData(userId: string) {
  const [holdings, accounts] = await Promise.all([getInvestments(userId), getAccounts(userId)]);

  const enrichedHoldings = holdings.map((h) => {
    const quote = quoteForSymbol(h.symbol);
    const marketPrice = quote?.price ?? h.avgPrice;
    const marketValue = h.shares * marketPrice;
    const costBasis = h.shares * h.avgPrice;
    const gainLoss = marketValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    return {
      ...h,
      sector: quote?.sector ?? "Equity",
      marketPrice,
      marketValue,
      gainLoss,
      gainLossPercent,
      dayChangePercent: quote?.changePercent ?? 0,
    };
  });

  const portfolioValue = enrichedHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const dayChange = enrichedHoldings.reduce(
    (sum, h) => sum + h.marketValue * (h.dayChangePercent / 100),
    0
  );
  const dayChangePercent = portfolioValue > 0 ? (dayChange / portfolioValue) * 100 : 0;
  const availableCash = accounts.reduce((sum, a) => sum + a.balance, 0);

  return {
    portfolioValue,
    dayChange,
    dayChangePercent,
    positionsCount: enrichedHoldings.length,
    availableCash,
    holdings: enrichedHoldings,
    marketWatchlist: MARKET_WATCHLIST,
  };
}
