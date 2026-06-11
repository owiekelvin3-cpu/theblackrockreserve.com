import { prisma } from "@/lib/prisma";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import {
  calculateInvestmentFee,
  getMarketAssetBySymbol,
} from "@/lib/market-assets";

export interface ExecuteSellInput {
  userId: string;
  symbol: string;
  shares?: number;
  amountUsd?: number;
  accountId?: string;
}

export interface ExecuteSellResult {
  orderId: string;
  symbol: string;
  assetName: string;
  sharesSold: number;
  priceAtSale: number;
  grossProceeds: number;
  fee: number;
  netProceeds: number;
  costBasis: number;
  realizedPnl: number;
  newBalance: number;
  newProfitBalance: number;
  createdAt: string;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function roundShares(n: number) {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export async function executeSell(input: ExecuteSellInput): Promise<ExecuteSellResult> {
  const { userId, symbol, shares: sharesInput, amountUsd, accountId } = input;
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) throw new Error("Invalid symbol");

  const asset = await getMarketAssetBySymbol(normalizedSymbol);
  if (!asset) throw new Error("Asset not available for trading");

  const holding = await prisma.investment.findUnique({
    where: { userId_symbol: { userId, symbol: normalizedSymbol } },
  });
  if (!holding) throw new Error("You do not hold this asset");

  const heldShares = Number(holding.shares);
  const avgPrice = Number(holding.avgPrice);
  if (heldShares <= 0) throw new Error("You do not hold this asset");

  const priceAtSale = asset.price;
  let sharesToSell = 0;

  if (sharesInput != null && Number.isFinite(sharesInput) && sharesInput > 0) {
    sharesToSell = roundShares(sharesInput);
  } else if (amountUsd != null && Number.isFinite(amountUsd) && amountUsd > 0) {
    sharesToSell = roundShares(amountUsd / priceAtSale);
  } else {
    throw new Error("Enter shares or a sale amount");
  }

  if (sharesToSell <= 0) throw new Error("Sale amount is too small for the current share price");
  if (sharesToSell > heldShares + 0.000001) {
    throw new Error("Insufficient shares to sell");
  }

  if (sharesToSell > heldShares) sharesToSell = heldShares;

  const grossProceeds = roundMoney(sharesToSell * priceAtSale);
  if (grossProceeds < asset.minInvestment) {
    throw new Error(`Minimum sale value is $${asset.minInvestment.toFixed(2)}`);
  }

  const fee = calculateInvestmentFee(grossProceeds);
  const netProceeds = roundMoney(grossProceeds - fee);
  const costBasis = roundMoney(sharesToSell * avgPrice);
  const realizedPnl = roundMoney(netProceeds - costBasis);

  const accounts = await ensureUserBankAccounts(userId);
  const account =
    (accountId ? accounts.find((a) => a.id === accountId) : null) ??
    accounts.find((a) => a.type === "checking") ??
    accounts[0];
  if (!account) throw new Error("No account available for settlement");

  const recentDuplicate = await prisma.investmentOrder.findFirst({
    where: {
      userId,
      symbol: normalizedSymbol,
      side: "SELL",
      shares: sharesToSell,
      createdAt: { gte: new Date(Date.now() - 5_000) },
    },
  });
  if (recentDuplicate) {
    throw new Error("Duplicate sale detected. Please wait a moment and try again.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const bankAccount = await tx.bankAccount.findFirst({
      where: { id: account.id, userId },
    });
    if (!bankAccount) throw new Error("Account not found");

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { profitBalance: true },
    });
    if (!user) throw new Error("User not found");

    const balanceBefore = Number(bankAccount.balance);
    const profitBefore = Number(user.profitBalance);
    const balanceAfter = roundMoney(balanceBefore + netProceeds);
    const profitAfter = roundMoney(profitBefore + realizedPnl);

    await tx.bankAccount.update({
      where: { id: account.id },
      data: { balance: balanceAfter },
    });

    await tx.user.update({
      where: { id: userId },
      data: { profitBalance: profitAfter },
    });

    const remainingShares = roundShares(heldShares - sharesToSell);
    if (remainingShares <= 0.000001) {
      await tx.investment.delete({ where: { id: holding.id } });
    } else {
      await tx.investment.update({
        where: { id: holding.id },
        data: { shares: remainingShares },
      });
    }

    const order = await tx.investmentOrder.create({
      data: {
        userId,
        accountId: account.id,
        symbol: normalizedSymbol,
        assetName: asset.name,
        side: "SELL",
        amountUsd: grossProceeds,
        shares: sharesToSell,
        priceAtPurchase: priceAtSale,
        fee,
        totalCost: netProceeds,
        realizedPnl,
        status: "COMPLETED",
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "SALE",
        amount: netProceeds,
        description: `Sold ${sharesToSell} shares of ${normalizedSymbol} — ${asset.name}`,
        status: "COMPLETED",
      },
    });

    if (realizedPnl > 0) {
      await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "PROFIT_CREDIT",
          amount: realizedPnl,
          description: `Realized gain on ${normalizedSymbol} sale`,
          status: "COMPLETED",
        },
      });
    } else if (realizedPnl < 0) {
      await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "PROFIT_DEBIT",
          amount: Math.abs(realizedPnl),
          description: `Realized loss on ${normalizedSymbol} sale`,
          status: "COMPLETED",
        },
      });
    }

    return { order, balanceAfter, profitAfter };
  });

  return {
    orderId: result.order.id,
    symbol: normalizedSymbol,
    assetName: asset.name,
    sharesSold: sharesToSell,
    priceAtSale,
    grossProceeds,
    fee,
    netProceeds,
    costBasis,
    realizedPnl,
    newBalance: result.balanceAfter,
    newProfitBalance: result.profitAfter,
    createdAt: result.order.createdAt.toISOString(),
  };
}
