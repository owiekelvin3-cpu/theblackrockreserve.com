import { prisma } from "@/lib/prisma";

export async function getPendingWithdrawalTotal(userId: string, accountId: string, excludeId?: string) {
  const agg = await prisma.withdrawalRequest.aggregate({
    where: {
      userId,
      accountId,
      status: "PENDING",
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    _sum: { amountUsd: true },
  });
  return Number(agg._sum.amountUsd ?? 0);
}

/** Batch-compute available balances for all user accounts in two queries. */
export async function getAvailableBalancesMap(
  userId: string,
  accounts: { id: string; balance: { toString(): string } | number }[],
  excludeWithdrawalId?: string
) {
  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) return {} as Record<string, number>;

  const pending = await prisma.withdrawalRequest.groupBy({
    by: ["accountId"],
    where: {
      userId,
      accountId: { in: accountIds },
      status: "PENDING",
      ...(excludeWithdrawalId ? { id: { not: excludeWithdrawalId } } : {}),
    },
    _sum: { amountUsd: true },
  });

  const pendingMap = new Map(pending.map((p) => [p.accountId, Number(p._sum.amountUsd ?? 0)]));

  return Object.fromEntries(
    accounts.map((a) => {
      const balance = Number(a.balance);
      const reserved = pendingMap.get(a.id) ?? 0;
      return [a.id, Math.max(0, balance - reserved)];
    })
  ) as Record<string, number>;
}

export async function getAvailableBalance(userId: string, accountId: string, excludeWithdrawalId?: string) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true, balance: true },
  });
  if (!account) return null;

  const map = await getAvailableBalancesMap(userId, [account], excludeWithdrawalId);
  return map[accountId] ?? 0;
}
