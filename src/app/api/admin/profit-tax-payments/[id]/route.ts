import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { profitTaxPaymentReviewSchema } from "@/lib/validations";
import { settleProfitTaxPayment } from "@/lib/profit-tax";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = profitTaxPaymentReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const payment = await prisma.profitTaxPayment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        profitWithdrawalRequest: true,
      },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    let emailPayload: { userId: string; title: string; message: string } | null = null;

    if (parsed.data.status === "PAID") {
      await runInteractiveTransaction(async (tx) => {
        const result = await settleProfitTaxPayment(id, {
          adminId: session.user.id,
          reviewNote: parsed.data.reviewNote,
          tx,
        });
        const title = "Profit tax verified";
        const message = `Your profit tax of ${formatCurrency(result.amountUsd)} has been verified. ${formatCurrency(result.profitAmount)} has been credited to your main balance.`;
        await createUserNotification(
          { userId: result.userId, type: "PROFIT_TAX_PAID", title, message },
          tx
        );
        emailPayload = { userId: result.userId, title, message };
      });
    } else {
      await runInteractiveTransaction(async (tx) => {
        await tx.profitTaxPayment.update({
          where: { id },
          data: {
            status: "REJECTED",
            reviewedBy: session.user.id,
            reviewNote: parsed.data.reviewNote?.trim() || null,
            paidAt: null,
            txHash: null,
            proofNote: null,
            proofImage: null,
          },
        });
        const title = "Profit tax payment rejected";
        const message = `Your profit tax payment was not accepted.${parsed.data.reviewNote ? ` Reason: ${parsed.data.reviewNote}` : " Please submit a new payment with valid proof."}`;
        await createUserNotification(
          { userId: payment.userId, type: "PROFIT_TAX_REJECTED", title, message },
          tx
        );
        emailPayload = { userId: payment.userId, title, message };
      });
    }

    if (emailPayload) {
      await sendUserNotificationEmail(emailPayload);
    }

    await logAdminAction(
      session.user.id,
      `PROFIT_TAX_PAYMENT_${parsed.data.status}`,
      { paymentId: id, userId: payment.userId, status: parsed.data.status },
      payment.userId,
      getClientIp(req)
    );

    invalidateAdminCaches();

    const updated = await prisma.profitTaxPayment.findUnique({ where: { id } });
    return NextResponse.json({ payment: updated });
  } catch (error) {
    console.error("Profit tax payment review error:", error);
    const message = error instanceof Error ? error.message : "Failed to review tax payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
