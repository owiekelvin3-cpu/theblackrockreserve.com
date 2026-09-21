import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getInvestments } from "@/lib/dashboard-data";
import { getInvestedBalance, getProfitAvailability, getTradingRealizedProfit, getActivePendingProfitWithdrawal } from "@/lib/user-balances";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { accrueInvestmentProfitsForUser } = await import("@/lib/investment-accrual");
    await accrueInvestmentProfitsForUser(userId).catch((error) =>
      console.error("Investments profit accrual error:", error)
    );

    const [holdings, investedBalance, profitAvailability, pendingProfitWithdrawal, tradingRealizedProfit] = await Promise.all([
      getInvestments(userId),
      getInvestedBalance(userId),
      getProfitAvailability(userId),
      getActivePendingProfitWithdrawal(userId),
      getTradingRealizedProfit(userId),
    ]);
    const { profitBalance, availableProfitBalance, lockedProfitBalance } = profitAvailability;
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    return NextResponse.json({
      holdings,
      totalValue,
      investedBalance,
      profitBalance,
      availableProfitBalance,
      lockedProfitBalance,
      pendingProfitWithdrawal,
      tradingRealizedProfit,
    });
  } catch (error) {
    console.error("Investments fetch error:", error);
    return NextResponse.json({ error: "Failed to load investments" }, { status: 500 });
  }
}
