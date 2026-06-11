import { prisma } from "@/lib/prisma";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import {
  calculateInvestmentFee,
  getMarketAssetBySymbol,
} from "@/lib/market-assets";

export interface ExecuteInvestmentInput {
  userId: string;
  symbol: string;
  amountUsd: number;
  accountId?: string;
  idempotencyKey?: string;
}

export interface ExecuteInvestmentResult {
  orderId: string;
  symbol: string;
  assetName: string;
  amountUsd: number;
  shares: number;
  priceAtPurchase: number;
  fee: number;
  totalCost: number;
  newBalance: number;
  createdAt: string;
}

export async function executeInvestment(
  input: ExecuteInvestmentInput
): Promise<ExecuteInvestmentResult> {
  const { userId, symbol, amountUsd, accountId, idempotencyKey } = input;
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) throw new Error("Invalid symbol");
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("Investment amount must be a positive number");
  }

  const asset = await getMarketAssetBySymbol(normalizedSymbol);
  if (!asset) throw new Error("Asset not available for investment");

  if (amountUsd < asset.minInvestment) {
    throw new Error(`Minimum investment is $${asset.minInvestment.toFixed(2)}`);
  }

  if (idempotencyKey) {
    const existing = await prisma.investmentOrder.findFirst({
      where: {
        userId,
        symbol: normalizedSymbol,
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (
      existing &&
      Number(existing.amountUsd) === amountUsd &&
      Number(existing.totalCost) === amountUsd + calculateInvestmentFee(amountUsd)
    ) {
      const account = await prisma.bankAccount.findFirst({
        where: { userId, id: existing.accountId },
      });
      return {
        orderId: existing.id,
        symbol: existing.symbol,
        assetName: existing.assetName,
        amountUsd: Number(existing.amountUsd),
        shares: Number(existing.shares),
        priceAtPurchase: Number(existing.priceAtPurchase),
        fee: Number(existing.fee),
        totalCost: Number(existing.totalCost),
        newBalance: Number(account?.balance ?? 0),
        createdAt: existing.createdAt.toISOString(),
      };
    }
  }

  const accounts = await ensureUserBankAccounts(userId);
  const account =
    (accountId ? accounts.find((a) => a.id === accountId) : null) ??
    accounts.find((a) => a.type === "checking") ??
    accounts[0];

  if (!account) throw new Error("No account available for investment");

  const fee = calculateInvestmentFee(amountUsd);
  const totalCost = Math.round((amountUsd + fee) * 100) / 100;
  const priceAtPurchase = asset.price;
  const shares = Math.round((amountUsd / priceAtPurchase) * 1_000_000) / 1_000_000;

  if (shares <= 0) throw new Error("Investment amount too small for current share price");

  const recentDuplicate = await prisma.investmentOrder.findFirst({
    where: {
      userId,
      symbol: normalizedSymbol,
      amountUsd,
      createdAt: { gte: new Date(Date.now() - 5_000) },
    },
  });
  if (recentDuplicate) {
    throw new Error("Duplicate investment detected. Please wait a moment and try again.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const bankAccount = await tx.bankAccount.findFirst({
      where: { id: account.id, userId },
    });
    if (!bankAccount) throw new Error("Account not found");

    const balanceBefore = Number(bankAccount.balance);
    if (balanceBefore < totalCost) {
      throw new Error("Insufficient wallet balance");
    }

    const balanceAfter = Math.round((balanceBefore - totalCost) * 100) / 100;

    await tx.bankAccount.update({
      where: { id: account.id },
      data: { balance: balanceAfter },
    });

    const order = await tx.investmentOrder.create({
      data: {
        userId,
        accountId: account.id,
        symbol: normalizedSymbol,
        assetName: asset.name,
        side: "BUY",
        amountUsd,
        shares,
        priceAtPurchase,
        fee,
        totalCost,
        status: "COMPLETED",
      },
    });

    const existingHolding = await tx.investment.findUnique({
      where: { userId_symbol: { userId, symbol: normalizedSymbol } },
    });

    if (existingHolding) {
      const oldShares = Number(existingHolding.shares);
      const oldAvg = Number(existingHolding.avgPrice);
      const newShares = oldShares + shares;
      const newAvg = Math.round(((oldShares * oldAvg + shares * priceAtPurchase) / newShares) * 100) / 100;

      await tx.investment.update({
        where: { id: existingHolding.id },
        data: { shares: newShares, avgPrice: newAvg },
      });
    } else {
      await tx.investment.create({
        data: {
          userId,
          symbol: normalizedSymbol,
          name: asset.name,
          shares,
          avgPrice: priceAtPurchase,
        },
      });
    }

    await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "INVESTMENT",
        amount: totalCost,
        description: `Investment in ${normalizedSymbol} — ${asset.name}`,
        status: "COMPLETED",
      },
    });

    await tx.marketAsset.update({
      where: { symbol: normalizedSymbol },
      data: { popularity: { increment: 1 } },
    });

    return { order, balanceAfter };
  });

  return {
    orderId: result.order.id,
    symbol: normalizedSymbol,
    assetName: asset.name,
    amountUsd,
    shares,
    priceAtPurchase,
    fee,
    totalCost,
    newBalance: result.balanceAfter,
    createdAt: result.order.createdAt.toISOString(),
  };
}
