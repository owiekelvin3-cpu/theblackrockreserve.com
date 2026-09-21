import { Prisma } from "@prisma/client";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { dailyInvestmentProfitEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { isEmailEnabledForCategory, parseNotificationPrefs } from "@/lib/notification-prefs";
import { mapMarketAsset } from "@/lib/market-asset-mapper";
import {
  addUtcDays,
  calculateHoldReturn,
  findDurationPlan,
  payoutAmountForDay,
  splitDailyProfit,
  utcDateOnly,
  utcDaysInclusive,
  maturityDateFromDays,
  type MarketDurationPlan,
} from "@/lib/market-duration";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

type AccrualOrder = {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  assetName: string;
  durationDays: number | null;
  projectedReturnUsd: Prisma.Decimal | number | null;
  dailyProfitUsd: Prisma.Decimal | number | null;
  accruedProfitUsd: Prisma.Decimal | number;
  maturityAt: Date | null;
  createdAt: Date;
  accrualClosedAt: Date | null;
};

async function backfillOrderSchedule(order: AccrualOrder) {
  const durationDays = order.durationDays ?? 0;
  const projected = roundMoney(Number(order.projectedReturnUsd ?? 0));
  if (durationDays < 1 || projected <= 0) return null;

  const { daily } = splitDailyProfit(projected, durationDays);
  const maturityAt = order.maturityAt ?? maturityDateFromDays(durationDays, order.createdAt);
  const dailyProfitUsd = order.dailyProfitUsd != null ? roundMoney(Number(order.dailyProfitUsd)) : daily;

  if (order.maturityAt && order.dailyProfitUsd != null) {
    return { dailyProfitUsd, maturityAt, projected, durationDays };
  }

  await prisma.investmentOrder.update({
    where: { id: order.id },
    data: {
      dailyProfitUsd: order.dailyProfitUsd == null ? dailyProfitUsd : undefined,
      maturityAt: order.maturityAt ?? maturityAt,
    },
  });

  return { dailyProfitUsd, maturityAt, projected, durationDays };
}

async function accrueOrder(order: AccrualOrder, now: Date) {
  const schedule = await backfillOrderSchedule(order);
  if (!schedule) return 0;

  const { projected, durationDays } = schedule;
  const already = roundMoney(Number(order.accruedProfitUsd ?? 0));
  if (already >= projected - 0.001) {
    if (!order.accrualClosedAt) {
      await prisma.investmentOrder.update({
        where: { id: order.id },
        data: { accrualClosedAt: now },
      });
    }
    return 0;
  }

  const start = utcDateOnly(order.createdAt);
  const today = utcDateOnly(now);
  const dueDays = Math.min(durationDays, utcDaysInclusive(start, today));
  if (dueDays < 1) return 0;

  const existing = await prisma.investmentDailyCredit.findMany({
    where: { orderId: order.id },
    select: { dayDate: true, amount: true },
  });
  const paid = new Set(existing.map((row) => utcDateOnly(row.dayDate).toISOString()));
  const paidSum = roundMoney(existing.reduce((sum, row) => sum + Number(row.amount), 0));
  const alreadyPaid = Math.max(already, paidSum);

  const rows: { dayDate: Date; amount: number; dayIndex: number }[] = [];
  let running = alreadyPaid;
  for (let dayIndex = 1; dayIndex <= dueDays; dayIndex += 1) {
    const dayDate = addUtcDays(start, dayIndex - 1);
    if (paid.has(dayDate.toISOString())) continue;
    const amount = payoutAmountForDay(projected, durationDays, dayIndex, running);
    if (amount <= 0) continue;
    rows.push({ dayDate, amount, dayIndex });
    running = roundMoney(running + amount);
  }

  if (rows.length === 0) {
    if (alreadyPaid >= projected - 0.001 && !order.accrualClosedAt) {
      await prisma.investmentOrder.update({
        where: { id: order.id },
        data: { accruedProfitUsd: Math.min(alreadyPaid, projected), accrualClosedAt: now },
      });
    }
    return 0;
  }

  try {
    const credited = await runInteractiveTransaction(async (tx) => {
      await tx.investmentDailyCredit.createMany({
        data: rows.map((row) => ({
          orderId: order.id,
          userId: order.userId,
          symbol: order.symbol,
          dayDate: row.dayDate,
          amount: row.amount,
        })),
        skipDuplicates: true,
      });

      const agg = await tx.investmentDailyCredit.aggregate({
        where: { orderId: order.id },
        _sum: { amount: true },
      });
      const newAccrued = roundMoney(Math.min(projected, Number(agg._sum.amount ?? 0)));
      const delta = roundMoney(Math.max(0, newAccrued - Math.max(already, alreadyPaid)));
      if (delta <= 0) {
        await tx.investmentOrder.update({
          where: { id: order.id },
          data: {
            accruedProfitUsd: newAccrued,
            accrualClosedAt: newAccrued >= projected - 0.001 ? now : undefined,
          },
        });
        return 0;
      }

      await tx.user.update({
        where: { id: order.userId },
        data: { profitBalance: { increment: delta } },
      });

      await tx.investmentOrder.update({
        where: { id: order.id },
        data: {
          accruedProfitUsd: newAccrued,
          dailyProfitUsd: order.dailyProfitUsd ?? splitDailyProfit(projected, durationDays).daily,
          maturityAt: order.maturityAt ?? maturityDateFromDays(durationDays, order.createdAt),
          accrualClosedAt: newAccrued >= projected - 0.001 ? now : undefined,
        },
      });

      await tx.transaction.createMany({
        data: rows.map((row) => ({
          userId: order.userId,
          accountId: order.accountId,
          type: "PROFIT_CREDIT",
          amount: row.amount,
          description: `Daily ${order.symbol} profit — day ${row.dayIndex} of ${durationDays}`,
          status: "COMPLETED",
        })),
      });

      order.accruedProfitUsd = newAccrued;
      return delta;
    });

    return roundMoney(credited);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return 0;
    }
    throw error;
  }
}

const FALLBACK_DURATION_PLAN: MarketDurationPlan = {
  id: "30d",
  days: 30,
  label: "30 Days",
  returnPercent: 8,
  enabled: true,
};

function needsDurationSchedule(order: {
  durationDays: number | null;
  projectedReturnUsd: Prisma.Decimal | number | null;
}) {
  return (order.durationDays ?? 0) < 1 || Number(order.projectedReturnUsd ?? 0) <= 0;
}

/** Attach the stock's current duration plan to open buys that were placed before timed returns existed. */
export async function assignDurationToOpenBuys(userId?: string) {
  const missing = await prisma.investmentOrder.findMany({
    where: {
      ...(userId ? { userId } : {}),
      side: "BUY",
      accrualClosedAt: null,
      OR: [{ durationDays: null }, { durationDays: { lte: 0 } }, { projectedReturnUsd: null }, { projectedReturnUsd: { lte: 0 } }],
    },
  });
  if (missing.length === 0) return 0;

  const userIds = userId ? [userId] : Array.from(new Set(missing.map((order) => order.userId)));
  const holdings = await prisma.investment.findMany({
    where: {
      userId: userIds.length === 1 ? userIds[0] : { in: userIds },
      shares: { gt: 0 },
    },
    select: { userId: true, symbol: true },
  });
  const open = new Set(holdings.map((holding) => `${holding.userId}:${holding.symbol}`));
  const eligible = missing.filter((order) => open.has(`${order.userId}:${order.symbol}`));
  if (eligible.length === 0) return 0;

  const symbols = Array.from(new Set(eligible.map((order) => order.symbol)));
  const assets = await prisma.marketAsset.findMany({
    where: { symbol: { in: symbols } },
  });
  const assetBySymbol = new Map(assets.map((asset) => [asset.symbol, mapMarketAsset(asset)]));

  let updated = 0;
  for (const order of eligible) {
    if (!needsDurationSchedule(order)) continue;
    const asset = assetBySymbol.get(order.symbol);
    const plan = (asset ? findDurationPlan(asset) : null) ?? FALLBACK_DURATION_PLAN;
    const projected = calculateHoldReturn(Number(order.amountUsd), plan.returnPercent, plan.days);
    if (projected.profit <= 0) continue;
    const split = splitDailyProfit(projected.profit, plan.days);

    await prisma.investmentOrder.update({
      where: { id: order.id },
      data: {
        durationDays: plan.days,
        durationPlanId: plan.id,
        durationLabel: plan.label,
        expectedReturnPercent: plan.returnPercent,
        projectedReturnUsd: projected.profit,
        dailyProfitUsd: split.daily,
        maturityAt: order.maturityAt ?? maturityDateFromDays(plan.days, order.createdAt),
      },
    });
    updated += 1;
  }

  return updated;
}

export async function accrueInvestmentProfitsForUser(userId: string, now = new Date()) {
  await assignDurationToOpenBuys(userId);

  const orders = await prisma.investmentOrder.findMany({
    where: {
      userId,
      side: "BUY",
      accrualClosedAt: null,
      durationDays: { gt: 0 },
      projectedReturnUsd: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
  });

  let total = 0;
  let daysCredited = 0;
  const holdingTotals = new Map<string, { symbol: string; assetName: string; amount: number }>();
  for (const order of orders) {
    const amount = await accrueOrder(order, now);
    if (amount > 0) {
      total += amount;
      daysCredited += 1;
      const existing = holdingTotals.get(order.symbol);
      if (existing) {
        existing.amount = roundMoney(existing.amount + amount);
      } else {
        holdingTotals.set(order.symbol, {
          symbol: order.symbol,
          assetName: order.assetName,
          amount,
        });
      }
    }
  }

  total = roundMoney(total);
  if (total > 0) {
    const holdings = Array.from(holdingTotals.values());
    const holdingsLabel = holdings
      .map((h) => `${h.symbol} ${formatCurrency(h.amount)}`)
      .join(", ");
    const title = "Daily investment profit";
    const message = `${formatCurrency(total)} was added to your profit balance. You can move it to Primary Checking after the holding reaches its full return.`;

    await createUserNotification({
      userId,
      type: "PROFIT_CREDIT",
      title,
      message,
    }).catch((error) => console.error("Daily profit notification error:", error));

    await sendDailyInvestmentProfitEmail({
      userId,
      amount: total,
      holdingsLabel,
    }).catch((error) => console.error("Daily profit email error:", error));
  }

  return { total, orders: daysCredited };
}

async function sendDailyInvestmentProfitEmail(params: {
  userId: string;
  amount: number;
  holdingsLabel: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true, notificationPrefs: true, profitBalance: true },
  });
  if (!user?.email) return { sent: false as const, reason: "no_email" as const };

  const prefs = parseNotificationPrefs(user.notificationPrefs);
  if (!isEmailEnabledForCategory(prefs, "investments") && !isEmailEnabledForCategory(prefs, "transactions")) {
    return { sent: false as const, reason: "prefs_disabled" as const };
  }

  const mail = dailyInvestmentProfitEmail({
    name: user.name,
    amount: formatCurrency(params.amount),
    profitBalance: formatCurrency(Number(user.profitBalance)),
    holdings: params.holdingsLabel || "Timed holdings",
    siteUrl: getSiteUrl(),
  });

  return sendEmail({ to: user.email, ...mail });
}

export async function accrueAllInvestmentProfits(now = new Date()) {
  await assignDurationToOpenBuys();

  const users = await prisma.investmentOrder.findMany({
    where: {
      side: "BUY",
      accrualClosedAt: null,
      durationDays: { gt: 0 },
      projectedReturnUsd: { gt: 0 },
    },
    distinct: ["userId"],
    select: { userId: true },
  });

  let total = 0;
  let usersPaid = 0;
  for (const row of users) {
    const result = await accrueInvestmentProfitsForUser(row.userId, now);
    if (result.total > 0) {
      total += result.total;
      usersPaid += 1;
    }
  }

  return { total: roundMoney(total), usersPaid, usersChecked: users.length };
}

export async function closeAccrualsForSymbol(
  tx: Prisma.TransactionClient,
  userId: string,
  symbol: string
) {
  await tx.investmentOrder.updateMany({
    where: {
      userId,
      symbol,
      side: "BUY",
      accrualClosedAt: null,
    },
    data: { accrualClosedAt: new Date() },
  });
}
