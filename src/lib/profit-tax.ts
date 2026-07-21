import type { Prisma } from "@prisma/client";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { getPlatformSettings, SETTING_KEYS } from "@/lib/platform-settings";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import { deductFromUserAccounts, getSpendableBalance } from "@/lib/spendable-balance";
import { getAvailableProfitBalance, getPendingProfitWithdrawalReserve } from "@/lib/user-balances";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";

export type ActiveUserProfitTax = {
  id: string;
  percentage: number;
  active: boolean;
  updatedAt: Date;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeProfitTaxAmount(percentage: number, profitAmountUsd: number): number {
  const computed = roundMoney(profitAmountUsd * (percentage / 100));
  return Math.max(0.01, computed);
}

export async function getDefaultProfitTaxFromSettings(): Promise<ActiveUserProfitTax | null> {
  const settings = await getPlatformSettings([
    SETTING_KEYS.PROFIT_TAX_ENABLED,
    SETTING_KEYS.PROFIT_TAX_PERCENTAGE,
  ]);

  if (settings[SETTING_KEYS.PROFIT_TAX_ENABLED].trim().toLowerCase() !== "true") {
    return null;
  }

  const percentage = Number(settings[SETTING_KEYS.PROFIT_TAX_PERCENTAGE]);
  if (!Number.isFinite(percentage) || percentage <= 0) return null;

  return {
    id: "platform-default",
    percentage,
    active: true,
    updatedAt: new Date(),
  };
}

export async function getActiveUserProfitTax(userId: string): Promise<ActiveUserProfitTax | null> {
  const tax = await prisma.userProfitTax.findUnique({
    where: { userId },
    select: { id: true, percentage: true, active: true, updatedAt: true },
  });

  if (tax?.active) {
    const percentage = Number(tax.percentage);
    if (Number.isFinite(percentage) && percentage > 0) {
      return {
        id: tax.id,
        percentage,
        active: true,
        updatedAt: tax.updatedAt,
      };
    }
  }

  return getDefaultProfitTaxFromSettings();
}

export async function assignDefaultProfitTaxToUser(userId: string) {
  const existing = await prisma.userProfitTax.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return existing;

  const defaultTax = await getDefaultProfitTaxFromSettings();
  if (!defaultTax) return null;

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) return null;

  return prisma.userProfitTax.create({
    data: {
      userId,
      percentage: defaultTax.percentage,
      active: true,
      createdById: admin.id,
    },
    select: { id: true },
  });
}

export function buildProfitTaxUpsertData(percentage: number, createdById: string) {
  return {
    percentage,
    active: true,
    createdById,
  };
}

export function formatProfitTaxPaymentStatus(status: string) {
  switch (status) {
    case "UNPAID":
      return "Unpaid";
    case "PENDING_VERIFICATION":
      return "Pending Verification";
    case "PAID":
      return "Paid";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

export function formatProfitWithdrawalStatus(status: string) {
  switch (status) {
    case "AWAITING_TAX_PAYMENT":
      return "Awaiting Tax Payment";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

/** Create tax payment request without reducing profit until tax is confirmed. */
export async function createProfitTaxGatedWithdrawal(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount greater than zero");
  }

  const rounded = roundMoney(amount);
  const tax = await getActiveUserProfitTax(userId);
  if (!tax) {
    throw new Error("No profit tax configured");
  }

  const taxAmount = computeProfitTaxAmount(tax.percentage, rounded);
  const bankAccounts = await ensureUserBankAccounts(userId);
  if (!bankAccounts.length) throw new Error("No bank account found for user");

  const result = await runInteractiveTransaction(async (tx) => {
    const available = await getAvailableProfitBalance(userId, tx);
    if (available < rounded) {
      const reserved = await getPendingProfitWithdrawalReserve(userId, tx);
      throw new Error(
        reserved > 0
          ? `Insufficient available profit balance (${formatCurrency(available)} available after pending tax requests)`
          : `Insufficient profit balance (${formatCurrency(available)} available)`
      );
    }

    const request = await tx.profitWithdrawalRequest.create({
      data: {
        userId,
        amountUsd: rounded,
        assignedTaxAmount: taxAmount,
        taxPercentage: tax.percentage,
        status: "AWAITING_TAX_PAYMENT",
        taxPayment: {
          create: {
            userId,
            amountUsd: taxAmount,
            paymentMethod: "BITCOIN",
            status: "UNPAID",
          },
        },
      },
      include: { taxPayment: true },
    });

    return request;
  });

  return {
    id: result.id,
    amountUsd: rounded,
    assignedTaxAmount: taxAmount,
    taxPercentage: tax.percentage,
    taxPaymentId: result.taxPayment!.id,
    taxPaymentUrl: `/dashboard/profit/tax/${result.id}`,
  };
}

/** Deduct profit and credit checking after tax is confirmed. */
async function creditHeldProfitToChecking(
  tx: Prisma.TransactionClient,
  userId: string,
  amountUsd: number
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { profitBalance: true },
  });
  if (!user) throw new Error("User not found");

  const bankAccounts = await ensureUserBankAccounts(userId);
  const account =
    bankAccounts.find((a) => a.type === "checking") ?? bankAccounts[0];
  if (!account) throw new Error("No bank account found for user");

  const bankAccount = await tx.bankAccount.findFirst({
    where: { id: account.id, userId },
  });
  if (!bankAccount) throw new Error("Account not found");

  const liveProfit = Number(user.profitBalance);
  const liveBalance = Number(bankAccount.balance);
  const credit = roundMoney(amountUsd);

  if (liveProfit < credit) {
    throw new Error(
      `Insufficient profit balance (${formatCurrency(liveProfit)} available)`
    );
  }

  await tx.user.update({
    where: { id: userId },
    data: { profitBalance: roundMoney(liveProfit - credit) },
  });

  await tx.bankAccount.update({
    where: { id: account.id },
    data: { balance: roundMoney(liveBalance + credit) },
  });

  const transaction = await tx.transaction.create({
    data: {
      userId,
      accountId: account.id,
      type: "PROFIT_CREDIT",
      amount: credit,
      description: "Profit withdrawn to main balance",
      status: "COMPLETED",
    },
  });

  return { accountId: account.id, transactionId: transaction.id, mainBalance: roundMoney(liveBalance + credit) };
}

export async function settleProfitTaxPayment(
  paymentId: string,
  opts: {
    adminId?: string;
    reviewNote?: string;
    paymentMethod?: string;
    tx?: Prisma.TransactionClient;
  } = {}
) {
  const run = async (tx: Prisma.TransactionClient) => {
    const payment = await tx.profitTaxPayment.findUnique({
      where: { id: paymentId },
      include: {
        profitWithdrawalRequest: true,
      },
    });
    if (!payment) throw new Error("Tax payment not found");
    if (payment.status === "PAID") {
      return {
        userId: payment.userId,
        amountUsd: Number(payment.amountUsd),
        profitAmount: Number(payment.profitWithdrawalRequest.amountUsd),
        alreadyPaid: true as const,
      };
    }

    const request = payment.profitWithdrawalRequest;
    if (request.status !== "AWAITING_TAX_PAYMENT") {
      throw new Error("This profit withdrawal is not awaiting tax payment");
    }

    await tx.profitTaxPayment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentMethod: opts.paymentMethod ?? payment.paymentMethod,
        reviewedBy: opts.adminId ?? payment.reviewedBy,
        reviewNote: opts.reviewNote?.trim() || payment.reviewNote,
      },
    });

    await tx.profitWithdrawalRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED" },
    });

    const profitAmount = Number(request.amountUsd);
    const credit = await creditHeldProfitToChecking(tx, request.userId, profitAmount);

    return {
      userId: request.userId,
      amountUsd: Number(payment.amountUsd),
      profitAmount,
      alreadyPaid: false as const,
      transactionId: credit.transactionId,
      mainBalance: credit.mainBalance,
    };
  };

  if (opts.tx) return run(opts.tx);
  return runInteractiveTransaction(run);
}

export async function payProfitTaxFromBalance(userId: string, requestId: string) {
  const spendable = await getSpendableBalance(userId);

  const result = await runInteractiveTransaction(async (tx) => {
    const request = await tx.profitWithdrawalRequest.findFirst({
      where: { id: requestId, userId },
      include: { taxPayment: true },
    });
    if (!request) throw new Error("Profit withdrawal not found");
    if (request.status !== "AWAITING_TAX_PAYMENT") {
      throw new Error("This profit withdrawal is not awaiting tax payment");
    }
    if (!request.taxPayment) throw new Error("Tax payment record not found");
    if (request.taxPayment.status === "PAID") {
      throw new Error("Tax has already been paid");
    }
    if (request.taxPayment.status === "PENDING_VERIFICATION") {
      throw new Error("Tax payment is already pending verification");
    }

    const taxAmount = Number(request.taxPayment.amountUsd);
    if (spendable < taxAmount) {
      throw new Error(
        `Insufficient main balance. You need ${formatCurrency(taxAmount)} available to pay this tax.`
      );
    }

    const { primaryAccountId } = await deductFromUserAccounts(tx, userId, taxAmount);

    await tx.transaction.create({
      data: {
        userId,
        accountId: primaryAccountId,
        type: "PAYMENT",
        amount: taxAmount,
        description: "Profit withdrawal tax",
        status: "COMPLETED",
      },
    });

    return settleProfitTaxPayment(request.taxPayment.id, {
      paymentMethod: "BALANCE_DEDUCT",
      tx,
    });
  });

  const title = "Profit moved to main balance";
  const message = `${formatCurrency(result.profitAmount)} was transferred from your profit balance to your main account after tax payment.`;
  await createUserNotification({ userId, type: "PROFIT_WITHDRAWAL", title, message });
  await sendUserNotificationEmail({ userId, title, message });

  return result;
}

/** Allow resubmit after reject; profit was never deducted. */
export async function rejectProfitTaxPaymentProof(
  paymentId: string,
  adminId: string,
  reviewNote: string | undefined,
  tx: Prisma.TransactionClient
) {
  const payment = await tx.profitTaxPayment.findUnique({
    where: { id: paymentId },
  });
  if (!payment) throw new Error("Tax payment not found");

  await tx.profitTaxPayment.update({
    where: { id: paymentId },
    data: {
      status: "REJECTED",
      reviewedBy: adminId,
      reviewNote: reviewNote?.trim() || null,
      paidAt: null,
      txHash: null,
      proofNote: null,
      proofImage: null,
    },
  });

  return { userId: payment.userId, taxAmount: Number(payment.amountUsd) };
}

export { getSpendableBalance };
