import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getInvestments } from "@/lib/dashboard-data";
import { getInvestedBalance, getProfitBalance, getAvailableProfitBalance, getTradingRealizedProfit, getActivePendingProfitWithdrawal } from "@/lib/user-balances";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const [holdings, investedBalance, profitBalance, availableProfitBalance, pendingProfitWithdrawal, tradingRealizedProfit] = await Promise.all([
      getInvestments(userId),
      getInvestedBalance(userId),
      getProfitBalance(userId),
      getAvailableProfitBalance(userId),
      getActivePendingProfitWithdrawal(userId),
      getTradingRealizedProfit(userId),
    ]);
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    return NextResponse.json({
      holdings,
      totalValue,
      investedBalance,
      profitBalance,
      availableProfitBalance,
      pendingProfitWithdrawal,
      tradingRealizedProfit,
    });
  } catch (error) {
    console.error("Investments fetch error:", error);
    return NextResponse.json({ error: "Failed to load investments" }, { status: 500 });
  }
}
