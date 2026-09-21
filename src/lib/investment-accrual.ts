import { Prisma } from "@prisma/client";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { dailyInvestmentProfitEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { isEmailEnabledForCategory, parseNotificationPrefs } from "@/lib/notification-prefs";
import {
  addUtcDays,
  payoutAmountForDay,
  splitDailyProfit,
  utcDateOnly,
  utcDaysInclusive,
  maturityDateFromDays,
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

async function creditOneDay(order: AccrualOrder, dayDate: Date, dayIndex: number) {
  const projected = roundMoney(Number(order.projectedReturnUsd ?? 0));
  const durationDays = order.durationDays ?? 0;
  const already = roundMoney(Number(order.accruedProfitUsd ?? 0));
  if (already >= projected - 0.001) return 0;

  const amount = payoutAmountForDay(projected, durationDays, dayIndex, already);
  if (amount <= 0) return 0;

  try {
    const credited = await runInteractiveTransaction(async (tx) => {
      await tx.investmentDailyCredit.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          symbol: order.symbol,
          dayDate,
          amount,
        },
      });

      await tx.user.update({
        where: { id: order.userId },
        data: { profitBalance: { increment: amount } },
      });

      await tx.investmentOrder.update({
        where: { id: order.id },
        data: {
          accruedProfitUsd: { increment: amount },
          dailyProfitUsd: order.dailyProfitUsd ?? splitDailyProfit(projected, durationDays).daily,
          maturityAt: order.maturityAt ?? maturityDateFromDays(durationDays, order.createdAt),
        },
      });

      await tx.transaction.create({
        data: {
          userId: order.userId,
          accountId: order.accountId,
          type: "PROFIT_CREDIT",
          amount,
          description: `Daily ${order.symbol} profit — day ${dayIndex} of ${durationDays}`,
          status: "COMPLETED",
        },
      });

      return amount;
    });

    order.accruedProfitUsd = roundMoney(already + credited);
    return credited;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return 0;
    }
    throw error;
  }
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
    select: { dayDate: true },
  });
  const paid = new Set(existing.map((row) => utcDateOnly(row.dayDate).toISOString()));

  let credited = 0;
  for (let dayIndex = 1; dayIndex <= dueDays; dayIndex += 1) {
    const dayDate = addUtcDays(start, dayIndex - 1);
    if (paid.has(dayDate.toISOString())) continue;
    credited += await creditOneDay(order, dayDate, dayIndex);
  }

  if (roundMoney(Number(order.accruedProfitUsd ?? 0)) >= projected - 0.001) {
    await prisma.investmentOrder.update({
      where: { id: order.id },
      data: { accrualClosedAt: now },
    });
  }

  return roundMoney(credited);
}

export async function accrueInvestmentProfitsForUser(userId: string, now = new Date()) {
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
    const message = `${formatCurrency(total)} was added to your profit balance from your timed holdings.`;

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
