import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { withdrawalChargePaymentReviewSchema } from "@/lib/validations";
import { markChargePaymentPaid } from "@/lib/withdrawal-charge";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { getWithdrawalScriptSettings } from "@/lib/withdrawal-script";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = withdrawalChargePaymentReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const payment = await prisma.withdrawalChargePayment.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    let emailPayload: { userId: string; title: string; message: string } | null = null;

    if (parsed.data.status === "PAID") {
      const [scriptSettings, payerUser] = await Promise.all([
        getWithdrawalScriptSettings(),
        prisma.user.findUnique({
          where: { id: payment.userId },
          select: { withdrawalScriptStep: true },
        }),
      ]);
      const userStep = payerUser?.withdrawalScriptStep ?? 0;
      await runInteractiveTransaction(async (tx) => {
        const result = await markChargePaymentPaid(params.id, session.user.id, parsed.data.reviewNote, tx);
        const title = "Withdrawal charge verified";
        const message =
          scriptSettings.enabled && (userStep === 0 || userStep === 1 || userStep === 3)
            ? `Your withdrawal charge payment of ${formatCurrency(Number(result.amountUsd))} has been verified. Processing continues on your withdrawal now.`
            : `Your withdrawal charge payment of ${formatCurrency(Number(result.amountUsd))} has been verified. Your withdrawal request is now pending admin review.`;
        await createUserNotification(
          { userId: result.userId, type: "WITHDRAWAL_CHARGE_PAID", title, message },
          tx
        );
        emailPayload = { userId: result.userId, title, message };
      });
    } else if (parsed.data.status === "REJECTED") {
      await runInteractiveTransaction(async (tx) => {
        await tx.withdrawalChargePayment.update({
          where: { id: params.id },
          data: {
            status: "REJECTED",
            reviewedBy: session.user.id,
            reviewNote: parsed.data.reviewNote?.trim() || null,
            paidAt: null,
          },
        });
        const title = "Withdrawal charge payment rejected";
        const message = `Your withdrawal charge payment was not accepted.${parsed.data.reviewNote ? ` Reason: ${parsed.data.reviewNote}` : " Please submit a new deposit with valid proof."}`;
        await createUserNotification(
          { userId: payment.userId, type: "WITHDRAWAL_CHARGE_REJECTED", title, message },
          tx
        );
        emailPayload = { userId: payment.userId, title, message };
      });
    } else {
      await prisma.withdrawalChargePayment.update({
        where: { id: params.id },
        data: {
          status: "UNPAID",
          reviewedBy: session.user.id,
          reviewNote: parsed.data.reviewNote?.trim() || null,
          txHash: null,
          proofNote: null,
          paidAt: null,
        },
      });
    }

    if (emailPayload) {
      await sendUserNotificationEmail(emailPayload);
    }

    await logAdminAction(
      session.user.id,
      `WITHDRAWAL_CHARGE_PAYMENT_${parsed.data.status}`,
      { paymentId: params.id, userId: payment.userId, status: parsed.data.status },
      payment.userId,
      getClientIp(req)
    );

    invalidateAdminCaches();

    const updated = await prisma.withdrawalChargePayment.findUnique({ where: { id: params.id } });
    return NextResponse.json({ payment: updated });
  } catch (error) {
    console.error("Charge payment review error:", error);
    return NextResponse.json({ error: "Failed to review charge payment" }, { status: 500 });
  }
}
