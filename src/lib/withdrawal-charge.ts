import type { Prisma, WithdrawalChargeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings, SETTING_KEYS } from "@/lib/platform-settings";

export const ACTIVE_WITHDRAWAL_STATUSES = ["PENDING", "AWAITING_CHARGE_PAYMENT"] as const;

export type ActiveUserWithdrawalCharge = {
  id: string;
  chargeType: WithdrawalChargeType;
  amountUsd: number;
  percentage: number | null;
  active: boolean;
  updatedAt: Date;
};

export function computeWithdrawalChargeAmount(
  charge: Pick<ActiveUserWithdrawalCharge, "chargeType" | "amountUsd" | "percentage">,
  withdrawalAmountUsd: number
): number {
  if (charge.chargeType === "PERCENTAGE" && charge.percentage != null && charge.percentage > 0) {
    const computed = Math.round(withdrawalAmountUsd * (charge.percentage / 100) * 100) / 100;
    return Math.max(0.01, computed);
  }
  return charge.amountUsd;
}

export function formatWithdrawalChargeSummary(
  charge: Pick<ActiveUserWithdrawalCharge, "chargeType" | "amountUsd" | "percentage">,
  formatCurrency: (amount: number) => string
): string {
  if (charge.chargeType === "PERCENTAGE" && charge.percentage != null) {
    return `${charge.percentage}% of withdrawal amount`;
  }
  return formatCurrency(charge.amountUsd);
}

function normalizeUserWithdrawalCharge(
  charge: {
    id: string;
    chargeType: WithdrawalChargeType;
    amountUsd: { toString(): string } | number;
    percentage: { toString(): string } | number | null;
    active: boolean;
    updatedAt: Date;
  }
): ActiveUserWithdrawalCharge | null {
  if (!charge.active) return null;

  if (charge.chargeType === "PERCENTAGE") {
    const percentage = charge.percentage != null ? Number(charge.percentage) : null;
    if (percentage == null || percentage <= 0) return null;
    return {
      id: charge.id,
      chargeType: charge.chargeType,
      amountUsd: 0,
      percentage,
      active: true,
      updatedAt: charge.updatedAt,
    };
  }

  const amount = Number(charge.amountUsd);
  if (amount <= 0) return null;
  return {
    id: charge.id,
    chargeType: charge.chargeType,
    amountUsd: amount,
    percentage: charge.percentage != null ? Number(charge.percentage) : null,
    active: true,
    updatedAt: charge.updatedAt,
  };
}

export async function getDefaultWithdrawalChargeFromSettings(): Promise<ActiveUserWithdrawalCharge | null> {
  const settings = await getPlatformSettings([
    SETTING_KEYS.WITHDRAWAL_CHARGE_ENABLED,
    SETTING_KEYS.WITHDRAWAL_CHARGE_TYPE,
    SETTING_KEYS.WITHDRAWAL_CHARGE_PERCENTAGE,
    SETTING_KEYS.WITHDRAWAL_CHARGE_AMOUNT_USD,
  ]);

  if (settings[SETTING_KEYS.WITHDRAWAL_CHARGE_ENABLED].trim().toLowerCase() !== "true") {
    return null;
  }

  const chargeType = settings[SETTING_KEYS.WITHDRAWAL_CHARGE_TYPE].trim().toUpperCase() as WithdrawalChargeType;
  const updatedAt = new Date();

  if (chargeType === "PERCENTAGE") {
    const percentage = Number(settings[SETTING_KEYS.WITHDRAWAL_CHARGE_PERCENTAGE]);
    if (!Number.isFinite(percentage) || percentage <= 0) return null;
    return {
      id: "platform-default",
      chargeType: "PERCENTAGE",
      amountUsd: 0,
      percentage,
      active: true,
      updatedAt,
    };
  }

  const amountUsd = Number(settings[SETTING_KEYS.WITHDRAWAL_CHARGE_AMOUNT_USD]);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return null;
  return {
    id: "platform-default",
    chargeType: "FIXED",
    amountUsd,
    percentage: null,
    active: true,
    updatedAt,
  };
}

export async function assignDefaultWithdrawalChargeToUser(userId: string) {
  const existing = await prisma.userWithdrawalCharge.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return existing;

  const defaultCharge = await getDefaultWithdrawalChargeFromSettings();
  if (!defaultCharge) return null;

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) return null;

  const chargeData = buildWithdrawalChargeUpsertData(
    defaultCharge.chargeType === "PERCENTAGE"
      ? { chargeType: "PERCENTAGE", percentage: defaultCharge.percentage! }
      : { chargeType: "FIXED", amountUsd: defaultCharge.amountUsd },
    admin.id
  );

  return prisma.userWithdrawalCharge.create({
    data: {
      userId,
      ...chargeData,
    },
    select: { id: true },
  });
}

export async function getActiveUserWithdrawalCharge(userId: string): Promise<ActiveUserWithdrawalCharge | null> {
  const charge = await prisma.userWithdrawalCharge.findUnique({
    where: { userId },
    select: {
      id: true,
      chargeType: true,
      amountUsd: true,
      percentage: true,
      active: true,
      updatedAt: true,
    },
  });

  if (charge) {
    const normalized = normalizeUserWithdrawalCharge(charge);
    if (normalized) return normalized;
  }

  return getDefaultWithdrawalChargeFromSettings();
}

export async function isWithdrawalChargePaid(withdrawalRequestId: string) {
  const payment = await prisma.withdrawalChargePayment.findUnique({
    where: { withdrawalRequestId },
    select: { status: true },
  });
  if (!payment) return true;
  return payment.status === "PAID";
}

export async function assertWithdrawalCanBeApproved(withdrawalRequestId: string) {
  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalRequestId },
    select: {
      status: true,
      assignedChargeAmount: true,
      chargePayment: { select: { status: true } },
    },
  });
  if (!withdrawal) throw new Error("Withdrawal not found");
  if (withdrawal.status === "AWAITING_CHARGE_PAYMENT") {
    throw new Error("Withdrawal is awaiting charge payment and cannot be approved yet");
  }
  if (withdrawal.assignedChargeAmount != null && Number(withdrawal.assignedChargeAmount) > 0) {
    if (!withdrawal.chargePayment || withdrawal.chargePayment.status !== "PAID") {
      throw new Error("Assigned withdrawal charge must be paid and verified before approval");
    }
  }
}

export async function markChargePaymentPaid(
  paymentId: string,
  adminId: string,
  reviewNote: string | undefined,
  tx: Prisma.TransactionClient = prisma
) {
  const existing = await tx.withdrawalChargePayment.findUnique({
    where: { id: paymentId },
    select: {
      withdrawalRequest: {
        select: {
          id: true,
          userId: true,
          accountId: true,
          amountUsd: true,
          status: true,
          fundsHeld: true,
        },
      },
    },
  });
  if (!existing?.withdrawalRequest) throw new Error("Charge payment not found");

  const { withdrawalRequest } = existing;

  // Legacy path only: funds not held yet — verify balance before activating
  if (!withdrawalRequest.fundsHeld) {
    const account = await tx.bankAccount.findFirst({
      where: { id: withdrawalRequest.accountId, userId: withdrawalRequest.userId },
      select: { balance: true },
    });
    if (!account) throw new Error("Withdrawal account not found");

    const pendingAgg = await tx.withdrawalRequest.aggregate({
      where: {
        userId: withdrawalRequest.userId,
        accountId: withdrawalRequest.accountId,
        status: "PENDING",
        fundsHeld: false,
        id: { not: withdrawalRequest.id },
      },
      _sum: { amountUsd: true },
    });
    const reserved = Number(pendingAgg._sum.amountUsd ?? 0);
    const available = Number(account.balance) - reserved;
    const amountUsd = Number(withdrawalRequest.amountUsd);
    if (amountUsd > available) {
      throw new Error(
        `Insufficient balance to activate withdrawal. User has $${available.toFixed(2)} available on this account.`
      );
    }
  }

  const payment = await tx.withdrawalChargePayment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      reviewedBy: adminId,
      reviewNote: reviewNote?.trim() || null,
    },
    select: { withdrawalRequestId: true, userId: true, amountUsd: true },
  });

  await tx.withdrawalRequest.update({
    where: { id: payment.withdrawalRequestId },
    data: { status: "PENDING" },
  });

  return payment;
}

export function formatWithdrawalStatus(status: string) {
  switch (status) {
    case "AWAITING_CHARGE_PAYMENT":
      return "Awaiting Charge Payment";
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
}

export function formatChargePaymentStatus(status: string) {
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

export function buildWithdrawalChargeUpsertData(
  input: {
    chargeType: WithdrawalChargeType;
    amountUsd?: number;
    percentage?: number;
  },
  createdById: string
) {
  if (input.chargeType === "PERCENTAGE") {
    return {
      chargeType: "PERCENTAGE" as const,
      amountUsd: 0,
      percentage: input.percentage!,
      active: true,
      createdById,
    };
  }

  return {
    chargeType: "FIXED" as const,
    amountUsd: input.amountUsd!,
    percentage: null,
    active: true,
    createdById,
  };
}
