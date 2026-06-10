import { prisma } from "@/lib/prisma";
import { currencyFlag } from "@/lib/currency-flags";

const CHECKING_NAME = "Primary Checking";
const SAVINGS_NAME = "High-Yield Savings";

export async function ensureCheckingAndSavingsAccounts(userId: string) {
  const existing = await prisma.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  let checking = existing.find((a) => a.type === "checking");
  let savings = existing.find((a) => a.type === "savings");

  if (!checking) {
    checking = await prisma.bankAccount.create({
      data: {
        userId,
        name: CHECKING_NAME,
        type: "checking",
        currency: "USD",
        balance: 0,
      },
    });
  }

  if (!savings) {
    savings = await prisma.bankAccount.create({
      data: {
        userId,
        name: SAVINGS_NAME,
        type: "savings",
        currency: "USD",
        balance: 0,
      },
    });
  }

  return { checking, savings };
}

export async function getSavingsSummary(userId: string) {
  const { checking, savings } = await ensureCheckingAndSavingsAccounts(userId);

  const checkingBalance = Math.round(Number(checking.balance) * 100) / 100;
  const savingsBalance = Math.round(Number(savings.balance) * 100) / 100;

  return {
    checking: {
      id: checking.id,
      name: checking.name,
      currency: checking.currency,
      balance: checkingBalance,
      flag: currencyFlag(checking.currency),
    },
    savings: {
      id: savings.id,
      name: savings.name,
      currency: savings.currency,
      balance: savingsBalance,
      flag: currencyFlag(savings.currency),
    },
    availableToSave: checkingBalance,
    savingsBalance,
  };
}

export async function transferSavings(
  userId: string,
  params: { direction: "to-savings" | "to-checking"; amount: number }
) {
  const { direction, amount } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount greater than zero");
  }

  const rounded = Math.round(amount * 100) / 100;
  const { checking, savings } = await ensureCheckingAndSavingsAccounts(userId);

  const from = direction === "to-savings" ? checking : savings;
  const to = direction === "to-savings" ? savings : checking;

  const fromBalance = Number(from.balance);
  if (fromBalance < rounded) {
    throw new Error(
      direction === "to-savings"
        ? "Insufficient checking balance"
        : "Insufficient savings balance"
    );
  }

  await prisma.$transaction(async (tx) => {
    const fromAccount = await tx.bankAccount.findFirst({
      where: { id: from.id, userId },
    });
    const toAccount = await tx.bankAccount.findFirst({
      where: { id: to.id, userId },
    });

    if (!fromAccount || !toAccount) throw new Error("Account not found");

    const sourceBalance = Number(fromAccount.balance);
    if (sourceBalance < rounded) throw new Error("Insufficient balance");

    await tx.bankAccount.update({
      where: { id: from.id },
      data: { balance: sourceBalance - rounded },
    });

    await tx.bankAccount.update({
      where: { id: to.id },
      data: { balance: Number(toAccount.balance) + rounded },
    });

    const label =
      direction === "to-savings"
        ? `Transfer to ${SAVINGS_NAME}`
        : `Withdraw from ${SAVINGS_NAME}`;

    await tx.transaction.create({
      data: {
        userId,
        accountId: from.id,
        type: "TRANSFER",
        amount: rounded,
        description: label,
        status: "COMPLETED",
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        accountId: to.id,
        type: "TRANSFER",
        amount: rounded,
        description:
          direction === "to-savings"
            ? `Deposit from ${CHECKING_NAME}`
            : `Deposit from ${SAVINGS_NAME}`,
        status: "COMPLETED",
      },
    });
  });

  return getSavingsSummary(userId);
}
