import { prisma } from "@/lib/prisma";
import { getInvestedBalance, getProfitBalance } from "@/lib/user-balances";
import { ensureCheckingAndSavingsAccounts, getSavingsSummary } from "@/lib/savings-service";

import { currencyFlag } from "@/lib/currency-flags";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export { currencyFlag };

/** Ensure checking + savings accounts exist (legacy signups, admin users, etc.) */
export async function ensureUserBankAccounts(userId: string) {
  const { checking, savings } = await ensureCheckingAndSavingsAccounts(userId);
  const extra = await prisma.bankAccount.findMany({
    where: {
      userId,
      id: { notIn: [checking.id, savings.id] },
    },
    orderBy: { createdAt: "asc" },
  });
  return [checking, savings, ...extra];
}

export async function getAccounts(userId: string) {
  const accounts = await ensureUserBankAccounts(userId);

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    number: `•••• ${a.id.slice(-4)}`,
    balance: Number(a.balance),
    currency: a.currency,
    type: a.type,
  }));
}

export async function getInvestments(userId: string) {
  const investments = await prisma.investment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return investments.map((i) => ({
    id: i.id,
    symbol: i.symbol,
    name: i.name,
    shares: Number(i.shares),
    avgPrice: Number(i.avgPrice),
    value: Number(i.shares) * Number(i.avgPrice),
  }));
}

export async function getTransactions(userId: string, type?: string, limit = 20) {
  return prisma.transaction.findMany({
    where: {
      userId,
      ...(type ? { type: type as "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "PAYMENT" | "INVESTMENT" | "PROFIT_CREDIT" | "PROFIT_DEBIT" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { account: true },
  });
}

import { getPublicDepositSettings } from "@/lib/platform-settings";

export async function getDashboardOverview(userId: string) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [accounts, investments, recentTransactions, yearTransactions, depositSettings, investedBalance, profitBalance, savings] =
    await Promise.all([
      getAccounts(userId),
      getInvestments(userId),
      getTransactions(userId, undefined, 10),
      prisma.transaction.findMany({
        where: { userId, createdAt: { gte: yearStart } },
        orderBy: { createdAt: "desc" },
      }),
      getPublicDepositSettings(),
      getInvestedBalance(userId),
      getProfitBalance(userId),
      getSavingsSummary(userId),
    ]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const CREDIT_TYPES = new Set(["DEPOSIT", "PROFIT_CREDIT"]);

  const currentMonthIndex = now.getMonth();
  const cashFlowData = MONTHS.slice(0, currentMonthIndex + 1).map((month, index) => {
    const monthTx = yearTransactions.filter((t) => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === index;
    });
    const monthTotal = monthTx.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const inflow = monthTx.reduce((sum, t) => {
      if (CREDIT_TYPES.has(t.type)) return sum + Number(t.amount);
      return sum;
    }, 0);
    const outflow = monthTx.reduce((sum, t) => {
      if (!CREDIT_TYPES.has(t.type)) return sum + Math.abs(Number(t.amount));
      return sum;
    }, 0);
    const tooltipDate = new Date(now.getFullYear(), index, 23).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return { month, value: monthTotal, inflow, outflow, tooltipDate };
  });

  const activities = recentTransactions.map((t) => ({
    id: t.id,
    name: t.description,
    orderId: `#${t.id.slice(-8).toUpperCase()}`,
    date: new Date(t.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: new Date(t.createdAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    price:
      t.type === "DEPOSIT" || t.type === "PROFIT_CREDIT"
        ? Number(t.amount)
        : -Math.abs(Number(t.amount)),
    status: t.status.charAt(0) + t.status.slice(1).toLowerCase(),
    type: t.type,
  }));

  return {
    totalBalance,
    investedBalance,
    profitBalance,
    /** @deprecated use investedBalance */
    savingsBalance: investedBalance,
    /** @deprecated use profitBalance */
    investmentValue: profitBalance,
    savings,
    cashFlowData,
    activities,
    accountCount: accounts.length,
    investmentCount: investments.length,
    bitcoinWalletAddress: depositSettings.bitcoinWalletAddress,
    depositsEnabled: !!depositSettings.bitcoinWalletAddress,
  };
}

export async function getAnalytics(userId: string) {
  const [transactions, investments, accounts] = await Promise.all([
    getTransactions(userId, undefined, 100),
    getInvestments(userId),
    getAccounts(userId),
  ]);

  const spendingByType: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "WITHDRAWAL" || t.type === "PAYMENT" || t.type === "TRANSFER") {
      const key = t.type.charAt(0) + t.type.slice(1).toLowerCase();
      spendingByType[key] = (spendingByType[key] ?? 0) + Math.abs(Number(t.amount));
    }
  }

  const monthlySpending = Object.entries(spendingByType).map(([category, amount]) => ({
    category,
    amount,
  }));

  const investmentTotal = investments.reduce((s, i) => s + i.value, 0);
  const cashTotal = accounts.reduce((s, a) => s + a.balance, 0);
  const total = investmentTotal + cashTotal;

  const allocation =
    total === 0
      ? []
      : [
          ...(investmentTotal > 0
            ? [{ name: "Investments", value: Math.round((investmentTotal / total) * 100), color: "#FF5F05" }]
            : []),
          ...(cashTotal > 0
            ? [{ name: "Cash", value: Math.round((cashTotal / total) * 100), color: "#71717A" }]
            : []),
        ];

  return { monthlySpending, allocation };
}
