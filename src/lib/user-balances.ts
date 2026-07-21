import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccounts } from "@/lib/dashboard-data";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/** Capital currently deployed in open holdings (cost basis), excluding sold positions. */
export async function getInvestedBalance(userId: string): Promise<number> {
  const holdings = await prisma.investment.findMany({
    where: { userId },
    select: { shares: true, avgPrice: true },
  });

  const total = holdings.reduce((sum, holding) => {
    const shares = Number(holding.shares);
    if (shares <= 0) return sum;
    return sum + shares * Number(holding.avgPrice);
  }, 0);

  return Math.round(total * 100) / 100;
}

export async function getProfitBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profitBalance: true },
  });
  return roundMoney(Number(user?.profitBalance ?? 0));
}

/** Profit reserved by withdrawals awaiting tax confirmation. */
export async function getPendingProfitWithdrawalReserve(
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const db = tx ?? prisma;
  const agg = await db.profitWithdrawalRequest.aggregate({
    where: { userId, status: "AWAITING_TAX_PAYMENT" },
    _sum: { amountUsd: true },
  });
  return roundMoney(Number(agg._sum.amountUsd ?? 0));
}

/** Spendable profit for new withdrawals (full balance minus pending tax requests). */
export async function getAvailableProfitBalance(
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const db = tx ?? prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { profitBalance: true },
  });
  const balance = roundMoney(Number(user?.profitBalance ?? 0));
  const reserved = await getPendingProfitWithdrawalReserve(userId, tx);
  return Math.max(0, roundMoney(balance - reserved));
}

/** Sum of realized P&L from completed sell orders. */
export async function getTradingRealizedProfit(userId: string): Promise<number> {
  const result = await prisma.investmentOrder.aggregate({
    where: { userId, side: "SELL", status: "COMPLETED" },
    _sum: { realizedPnl: true },
  });
  return Math.round(Number(result._sum.realizedPnl ?? 0) * 100) / 100;
}

export async function getUserBalanceSummary(userId: string) {
  const [accounts, investedBalance, profitBalance] = await Promise.all([
    getAccounts(userId),
    getInvestedBalance(userId),
    getProfitBalance(userId),
  ]);

  const mainBalance = Math.round(accounts.reduce((sum, a) => sum + a.balance, 0) * 100) / 100;
  const primaryAccount =
    accounts.find((a) => a.type === "checking") ?? accounts[0] ?? null;

  return {
    mainBalance,
    investedBalance,
    profitBalance,
    accounts,
    primaryAccountId: primaryAccount?.id ?? null,
  };
}
