import { prisma } from "@/lib/prisma";

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  JPY: "🇯🇵",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function currencyFlag(currency: string) {
  return CURRENCY_FLAGS[currency.toUpperCase()] ?? "💱";
}

export async function getAccounts(userId: string) {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

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
      ...(type ? { type: type as "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "PAYMENT" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { account: true },
  });
}

import { getPublicDepositSettings } from "@/lib/platform-settings";

export async function getDashboardOverview(userId: string) {
  const [accounts, investments, transactions, depositSettings] = await Promise.all([
    getAccounts(userId),
    getInvestments(userId),
    getTransactions(userId, undefined, 10),
    getPublicDepositSettings(),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsBalance = accounts
    .filter((a) => a.type === "savings")
    .reduce((sum, a) => sum + a.balance, 0);
  const investmentValue = investments.reduce((sum, i) => sum + i.value, 0);

  const wallets = accounts.map((a) => ({
    id: a.id,
    flag: currencyFlag(a.currency),
    currency: a.currency,
    balance: a.balance,
    active: a.balance >= 0,
    name: a.name,
  }));

  const now = new Date();
  const cashFlowData = MONTHS.map((month, index) => {
    const monthTotal = transactions
      .filter((t) => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === index;
      })
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    return { month, value: monthTotal };
  });

  const activities = transactions.map((t) => ({
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
    price: t.type === "DEPOSIT" ? Number(t.amount) : -Math.abs(Number(t.amount)),
    status: t.status.charAt(0) + t.status.slice(1).toLowerCase(),
    type: t.type,
  }));

  return {
    totalBalance,
    savingsBalance,
    investmentValue,
    wallets,
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
