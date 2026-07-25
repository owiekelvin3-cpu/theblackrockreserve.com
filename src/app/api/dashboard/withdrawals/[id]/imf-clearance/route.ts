import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getPublicDepositSettings } from "@/lib/platform-settings";
import { withdrawalChargePaymentSubmitSchema } from "@/lib/validations";
import { validateDepositProofImageDataUrl } from "@/lib/deposit-proof-image";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import QRCode from "qrcode";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id, userId },
      include: { imfClearancePayment: true },
    });
    if (!withdrawal?.imfClearancePayment) {
      return NextResponse.json({ error: "IMF clearance not found" }, { status: 404 });
    }

    const allowedPhases = ["AWAITING_IMF_CLEARANCE", "IMF_PENDING_VERIFICATION"];
    if (!allowedPhases.includes(withdrawal.scriptPhase)) {
      return NextResponse.json({ error: "IMF clearance is not required for this withdrawal" }, { status: 400 });
    }

    const depositSettings = await getPublicDepositSettings();
    let qrCodeDataUrl = "";
    if (depositSettings.bitcoinWalletAddress) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(`bitcoin:${depositSettings.bitcoinWalletAddress}`, {
          width: 220,
          margin: 2,
          color: { dark: "#FF5F05", light: "#0F0F0F" },
        });
      } catch {
        /* ignore */
      }
    }

    const payment = withdrawal.imfClearancePayment;
    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        amountUsd: Number(withdrawal.amountUsd),
      },
      imfPayment: {
        id: payment.id,
        amountUsd: Number(payment.amountUsd),
        status: payment.status,
      },
      chargePaymentMethods: {
        bitcoinWalletAddress: depositSettings.bitcoinWalletAddress,
        bitcoinPurchaseLink: depositSettings.bitcoinPurchaseLink,
        depositInstructions: depositSettings.depositInstructions,
        qrCodeDataUrl,
      },
      canPay: payment.status === "UNPAID" || payment.status === "REJECTED",
      submitted: payment.status === "PENDING_VERIFICATION",
      scriptPhase: withdrawal.scriptPhase,
    });
  } catch (error) {
    console.error("IMF clearance GET error:", error);
    return NextResponse.json({ error: "Failed to load IMF clearance details" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = withdrawalChargePaymentSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const proofCheck = validateDepositProofImageDataUrl(parsed.data.proofImage);
    if (!proofCheck.ok) {
      return NextResponse.json({ error: proofCheck.error }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id, userId },
      include: { imfClearancePayment: true },
    });
    if (!withdrawal?.imfClearancePayment) {
      return NextResponse.json({ error: "IMF clearance not found" }, { status: 404 });
    }
    const payment = withdrawal.imfClearancePayment;
    if (payment.status === "PAID" || payment.status === "PENDING_VERIFICATION") {
      return NextResponse.json({ error: "IMF clearance payment already submitted" }, { status: 400 });
    }

    const updated = await prisma.imfClearancePayment.update({
      where: { id: payment.id },
      data: {
        status: "PENDING_VERIFICATION",
        txHash: parsed.data.txHash?.trim() || null,
        proofNote: parsed.data.proofNote?.trim() || null,
        proofImage: parsed.data.proofImage,
        paymentMethod: parsed.data.paymentMethod,
      },
    });

    await prisma.withdrawalRequest.update({
      where: { id },
      data: { scriptPhase: "IMF_PENDING_VERIFICATION" },
    });

    const amount = Number(updated.amountUsd);
    try {
      await createUserNotification({
        userId,
        type: "WITHDRAWAL_CHARGE_SUBMITTED",
        title: "IMF clearance fee submitted",
        message: `Your Central Bank / IMF clearance payment of ${formatCurrency(amount)} has been submitted for verification.`,
      });
    } catch {
      /* ignore */
    }

    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      message: "IMF clearance payment submitted for verification.",
    });
  } catch (error) {
    console.error("IMF clearance POST error:", error);
    return NextResponse.json({ error: "Failed to submit IMF clearance payment" }, { status: 500 });
  }
}
