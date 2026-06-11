import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function accountDebitPriority(
  type: string,
  id: string,
  preferredAccountId?: string
): number {
  if (preferredAccountId && id === preferredAccountId) return 0;
  if (type === "checking") return 1;
  if (type === "savings") return 2;
  return 3;
}

export async function getSpendableBalance(userId: string): Promise<number> {
  const accounts = await prisma.bankAccount.findMany({
    where: { userId },
    select: { balance: true },
  });
  return roundMoney(accounts.reduce((sum, a) => sum + Number(a.balance), 0));
}

export async function deductFromUserAccounts(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  preferredAccountId?: string
): Promise<{ debits: { accountId: string; amount: number }[]; primaryAccountId: string }> {
  const amountDue = roundMoney(amount);
  if (amountDue <= 0) throw new Error("Invalid debit amount");

  const accounts = await tx.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const total = roundMoney(accounts.reduce((sum, a) => sum + Number(a.balance), 0));
  if (total < amountDue) {
    throw new Error("Insufficient wallet balance");
  }

  const sorted = [...accounts].sort(
    (a, b) =>
      accountDebitPriority(a.type, a.id, preferredAccountId) -
      accountDebitPriority(b.type, b.id, preferredAccountId)
  );

  let remaining = amountDue;
  const debits: { accountId: string; amount: number }[] = [];

  for (const account of sorted) {
    if (remaining <= 0) break;
    const balance = Number(account.balance);
    if (balance <= 0) continue;

    const debit = roundMoney(Math.min(balance, remaining));
    if (debit <= 0) continue;

    await tx.bankAccount.update({
      where: { id: account.id },
      data: { balance: roundMoney(balance - debit) },
    });

    debits.push({ accountId: account.id, amount: debit });
    remaining = roundMoney(remaining - debit);
  }

  if (remaining > 0) {
    throw new Error("Insufficient wallet balance");
  }

  const checking = sorted.find((a) => a.type === "checking");
  const primaryAccountId =
    debits.find((d) => d.accountId === preferredAccountId)?.accountId ??
    checking?.id ??
    debits[0]?.accountId ??
    sorted[0]?.id;

  if (!primaryAccountId) throw new Error("No account available for investment");

  return { debits, primaryAccountId };
}

export async function getSpendableBalanceInTx(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<number> {
  const accounts = await tx.bankAccount.findMany({
    where: { userId },
    select: { balance: true },
  });
  return roundMoney(accounts.reduce((sum, a) => sum + Number(a.balance), 0));
}
