import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { formatWithdrawalStatus, formatChargePaymentStatus } from "@/lib/withdrawal-charge";
import { getPublicDepositSettings } from "@/lib/platform-settings";
import { withdrawalChargePaymentSubmitSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id: params.id, userId },
      include: { chargePayment: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const account = await prisma.bankAccount.findFirst({
      where: { id: withdrawal.accountId, userId },
      select: { name: true },
    });

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
        /* ignore qr errors */
      }
    }

    const chargeAmount =
      withdrawal.assignedChargeAmount != null
        ? Number(withdrawal.assignedChargeAmount)
        : withdrawal.chargePayment
          ? Number(withdrawal.chargePayment.amountUsd)
          : null;

    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        amountUsd: Number(withdrawal.amountUsd),
        method: withdrawal.method,
        methodLabel: getWithdrawalMethodLabel(withdrawal.method),
        destination: withdrawal.destination,
        accountName: account?.name ?? null,
        status: withdrawal.status,
        statusLabel: formatWithdrawalStatus(withdrawal.status),
        assignedChargeAmount: chargeAmount,
        createdAt: withdrawal.createdAt.toISOString(),
      },
      chargePayment: withdrawal.chargePayment
        ? {
            id: withdrawal.chargePayment.id,
            status: withdrawal.chargePayment.status,
            statusLabel: formatChargePaymentStatus(withdrawal.chargePayment.status),
            amountUsd: Number(withdrawal.chargePayment.amountUsd),
            txHash: withdrawal.chargePayment.txHash,
            proofNote: withdrawal.chargePayment.proofNote,
            paidAt: withdrawal.chargePayment.paidAt?.toISOString() ?? null,
          }
        : null,
      chargePaymentMethods: {
        bitcoinWalletAddress: depositSettings.bitcoinWalletAddress,
        bitcoinPurchaseLink: depositSettings.bitcoinPurchaseLink,
        depositInstructions: depositSettings.depositInstructions,
        qrCodeDataUrl,
      },
      canPay:
        withdrawal.status === "AWAITING_CHARGE_PAYMENT" &&
        !!withdrawal.chargePayment &&
        (withdrawal.chargePayment.status === "UNPAID" || withdrawal.chargePayment.status === "REJECTED"),
    });
  } catch (error) {
    console.error("Pay charge GET error:", error);
    return NextResponse.json({ error: "Failed to load charge payment details" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = withdrawalChargePaymentSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id: params.id, userId },
      include: { chargePayment: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }
    if (withdrawal.status !== "AWAITING_CHARGE_PAYMENT") {
      return NextResponse.json({ error: "This withdrawal is not awaiting charge payment" }, { status: 400 });
    }
    if (!withdrawal.chargePayment) {
      return NextResponse.json({ error: "Charge payment record not found" }, { status: 400 });
    }
    if (withdrawal.chargePayment.status === "PAID") {
      return NextResponse.json({ error: "Charge has already been paid" }, { status: 400 });
    }
    if (withdrawal.chargePayment.status === "PENDING_VERIFICATION") {
      return NextResponse.json({ error: "Charge payment is already pending verification" }, { status: 400 });
    }

    const updated = await prisma.withdrawalChargePayment.update({
      where: { id: withdrawal.chargePayment.id },
      data: {
        status: "PENDING_VERIFICATION",
        txHash: parsed.data.txHash.trim(),
        proofNote: parsed.data.proofNote?.trim() || null,
        paymentMethod: parsed.data.paymentMethod,
      },
    });

    const amount = Number(updated.amountUsd);
    await createUserNotification({
      userId,
      type: "WITHDRAWAL_CHARGE_SUBMITTED",
      title: "Charge payment submitted",
      message: `Your withdrawal charge payment of ${formatCurrency(amount)} has been submitted for admin verification.`,
    });

    return NextResponse.json({
      success: true,
      message: "Charge payment proof submitted. An administrator will verify your deposit before processing your withdrawal.",
      chargePayment: {
        id: updated.id,
        status: updated.status,
        amountUsd: amount,
      },
    });
  } catch (error) {
    console.error("Pay charge error:", error);
    return NextResponse.json({ error: "Failed to submit charge payment" }, { status: 500 });
  }
}
