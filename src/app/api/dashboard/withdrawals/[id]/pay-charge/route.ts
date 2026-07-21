import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { formatWithdrawalStatus, formatChargePaymentStatus } from "@/lib/withdrawal-charge";
import { buildWithdrawalReceiptData } from "@/lib/withdrawal-receipt";
import { getPublicDepositSettings } from "@/lib/platform-settings";
import { withdrawalChargePaymentSubmitSchema } from "@/lib/validations";
import { validateDepositProofImageDataUrl } from "@/lib/deposit-proof-image";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import QRCode from "qrcode";

function applyTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id, userId },
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
    const chargePercent =
      chargeAmount && Number(withdrawal.amountUsd) > 0
        ? `${(((chargeAmount / Number(withdrawal.amountUsd)) * 1000) / 10).toString().replace(/\.0$/, "")}%`
        : "15%";
    const overviewMessage = applyTemplate(
      depositSettings.withdrawalChargeOverviewMessage,
      {
        amount: formatCurrency(Number(withdrawal.amountUsd)),
        percent: chargePercent,
      }
    );

    return NextResponse.json({
      withdrawal: {
        id: withdrawal.id,
        amountUsd: Number(withdrawal.amountUsd),
        method: withdrawal.method,
        methodLabel: getWithdrawalMethodLabel(withdrawal.method),
        destination: withdrawal.destination,
        destinationExtra: withdrawal.destinationExtra,
        note: withdrawal.note,
        accountName: account?.name ?? null,
        status: withdrawal.status,
        statusLabel: formatWithdrawalStatus(withdrawal.status),
        assignedChargeAmount: chargeAmount,
        createdAt: withdrawal.createdAt.toISOString(),
      },
      receipt: buildWithdrawalReceiptData({
        id: withdrawal.id,
        amountUsd: Number(withdrawal.amountUsd),
        method: withdrawal.method,
        destination: withdrawal.destination,
        destinationExtra: withdrawal.destinationExtra,
        note: withdrawal.note,
        accountName: account?.name ?? null,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        assignedChargeAmount: chargeAmount,
      }),
      chargePayment: withdrawal.chargePayment
        ? {
            id: withdrawal.chargePayment.id,
            status: withdrawal.chargePayment.status,
            statusLabel: formatChargePaymentStatus(withdrawal.chargePayment.status),
            amountUsd: Number(withdrawal.chargePayment.amountUsd),
            txHash: withdrawal.chargePayment.txHash,
            proofNote: withdrawal.chargePayment.proofNote,
            hasProofImage: Boolean(withdrawal.chargePayment.proofImage),
            paidAt: withdrawal.chargePayment.paidAt?.toISOString() ?? null,
          }
        : null,
      chargePaymentMethods: {
        bitcoinWalletAddress: depositSettings.bitcoinWalletAddress,
        bitcoinPurchaseLink: depositSettings.bitcoinPurchaseLink,
        depositInstructions: depositSettings.depositInstructions,
        qrCodeDataUrl,
      },
      content: {
        overviewMessage,
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
        txHash: parsed.data.txHash?.trim() || null,
        proofNote: parsed.data.proofNote?.trim() || null,
        proofImage: parsed.data.proofImage,
        paymentMethod: parsed.data.paymentMethod,
      },
    });

    const amount = Number(updated.amountUsd);
    try {
      await createUserNotification({
        userId,
        type: "WITHDRAWAL_CHARGE_SUBMITTED",
        title: "Charge payment submitted",
        message: `Your withdrawal charge payment of ${formatCurrency(amount)} has been submitted for admin verification.`,
      });
    } catch (notifyError) {
      console.error("Charge payment notification error:", notifyError);
    }

    invalidateAdminCaches();

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
