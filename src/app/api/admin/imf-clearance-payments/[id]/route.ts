import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { profitTaxPaymentReviewSchema } from "@/lib/validations";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { markImfClearancePaymentPaid } from "@/lib/withdrawal-script";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import { formatCurrency } from "@/lib/utils";

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

    const payment = await prisma.imfClearancePayment.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    if (parsed.data.status === "PAID") {
      await markImfClearancePaymentPaid(id, session.user.id, parsed.data.reviewNote);
    } else {
      await prisma.imfClearancePayment.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedBy: session.user.id,
          reviewNote: parsed.data.reviewNote?.trim() || null,
        },
      });
      await prisma.withdrawalRequest.update({
        where: { id: payment.withdrawalRequestId },
        data: { scriptPhase: "AWAITING_IMF_CLEARANCE" },
      });
    }

    await logAdminAction(
      session.user.id,
      parsed.data.status === "PAID" ? "IMF_CLEARANCE_PAID" : "IMF_CLEARANCE_REJECTED",
      { paymentId: id, amountUsd: Number(payment.amountUsd) },
      payment.userId,
      getClientIp(req)
    );

    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      message:
        parsed.data.status === "PAID"
          ? `IMF clearance of ${formatCurrency(Number(payment.amountUsd))} marked paid. Withdrawal moved to pending review.`
          : "IMF clearance payment rejected. User can resubmit.",
    });
  } catch (error) {
    console.error("Admin IMF payment PATCH error:", error);
    return NextResponse.json({ error: "Failed to review IMF payment" }, { status: 500 });
  }
}
