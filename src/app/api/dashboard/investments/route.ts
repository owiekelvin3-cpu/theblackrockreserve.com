import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getInvestments } from "@/lib/dashboard-data";
import { getInvestedBalance, getProfitBalance, getAvailableProfitBalance, getTradingRealizedProfit } from "@/lib/user-balances";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const [holdings, investedBalance, profitBalance, availableProfitBalance, tradingRealizedProfit] = await Promise.all([
      getInvestments(userId),
      getInvestedBalance(userId),
      getProfitBalance(userId),
      getAvailableProfitBalance(userId),
      getTradingRealizedProfit(userId),
    ]);
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    return NextResponse.json({
      holdings,
      totalValue,
      investedBalance,
      profitBalance,
      availableProfitBalance,
      tradingRealizedProfit,
    });
  } catch (error) {
    console.error("Investments fetch error:", error);
    return NextResponse.json({ error: "Failed to load investments" }, { status: 500 });
  }
}
