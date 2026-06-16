import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { currencyFlag } from "@/lib/currency-flags";
import { getPlatformSettings, SETTING_KEYS } from "@/lib/platform-settings";
import {
  ensureUserPrimaryAccountNumber,
} from "@/lib/bank-account-number";
import {
  bankAccountNumberSelect,
  getDbSchemaCapabilities,
} from "@/lib/db-schema-capabilities";

const CHECKING_NAME = "Primary Checking";
const SAVINGS_NAME = "High-Yield Savings";

export async function getHighYieldSavingsApy(): Promise<number> {
  const settings = await getPlatformSettings();
  const raw = Number(settings[SETTING_KEYS.HIGH_YIELD_SAVINGS_APY] || "20");
  if (!Number.isFinite(raw) || raw <= 0) return 20;
  return Math.round(raw * 100) / 100;
}

const BANK_ACCOUNT_CORE_SELECT = {
  id: true,
  userId: true,
  name: true,
  type: true,
  currency: true,
  balance: true,
  createdAt: true,
  updatedAt: true,
} as const;

type BankAccountRow = {
  id: string;
  userId: string;
  name: string;
  type: string;
  currency: string;
  balance: { toString(): string } | number;
  createdAt: Date;
  updatedAt: Date;
  accountNumber?: string | null;
};

export async function ensureCheckingAndSavingsAccounts(userId: string) {
  const caps = await getDbSchemaCapabilities();
  const select = {
    ...BANK_ACCOUNT_CORE_SELECT,
    ...bankAccountNumberSelect(caps),
  };

  const existing = (await prisma.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select,
  })) as BankAccountRow[];

  let checking = existing.find((a) => a.type === "checking");
  let savings = existing.find((a) => a.type === "savings");

  if (!checking) {
    checking = (await prisma.bankAccount.create({
      data: {
        userId,
        name: CHECKING_NAME,
        type: "checking",
        currency: "USD",
        balance: 0,
      },
      select,
    })) as BankAccountRow;
  }

  if (!savings) {
    savings = (await prisma.bankAccount.create({
      data: {
        userId,
        name: SAVINGS_NAME,
        type: "savings",
        currency: "USD",
        balance: 0,
      },
      select,
    })) as BankAccountRow;
  }

  if (caps.bankAccountNumbers) {
    await ensureUserPrimaryAccountNumber(userId);
    const refreshed = (await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select,
    })) as BankAccountRow[];
    checking = refreshed.find((a) => a.type === "checking") ?? checking;
    savings = refreshed.find((a) => a.type === "savings") ?? savings;
  }

  return { checking, savings };
}

export async function getSavingsSummary(userId: string) {
  const [{ checking, savings }, apyAnnualPercent] = await Promise.all([
    ensureCheckingAndSavingsAccounts(userId),
    getHighYieldSavingsApy(),
  ]);

  const checkingBalance = Math.round(Number(checking.balance) * 100) / 100;
  const savingsBalance = Math.round(Number(savings.balance) * 100) / 100;
  const projectedAnnualYield = Math.round(savingsBalance * (apyAnnualPercent / 100) * 100) / 100;

  return {
    checking: {
      id: checking.id,
      name: checking.name,
      accountNumber: checking.accountNumber ?? null,
      currency: checking.currency,
      balance: checkingBalance,
      flag: currencyFlag(checking.currency),
    },
    savings: {
      id: savings.id,
      name: savings.name,
      accountNumber: null,
      currency: savings.currency,
      balance: savingsBalance,
      flag: currencyFlag(savings.currency),
    },
    availableToSave: checkingBalance,
    savingsBalance,
    apyAnnualPercent,
    projectedAnnualYield,
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

  const caps = await getDbSchemaCapabilities();
  const select = {
    ...BANK_ACCOUNT_CORE_SELECT,
    ...bankAccountNumberSelect(caps),
  };

  await runInteractiveTransaction(async (tx) => {
    const fromAccount = await tx.bankAccount.findFirst({
      where: { id: from.id, userId },
      select,
    });
    const toAccount = await tx.bankAccount.findFirst({
      where: { id: to.id, userId },
      select,
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
