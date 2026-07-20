import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getPublicDepositSettings } from "@/lib/platform-settings";
import { profitTaxPaymentSubmitSchema } from "@/lib/validations";
import { validateDepositProofImageDataUrl } from "@/lib/deposit-proof-image";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { createUserNotification } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { formatReferenceId } from "@/lib/transaction-receipt";
import {
  formatProfitTaxPaymentStatus,
  formatProfitWithdrawalStatus,
  getSpendableBalance,
} from "@/lib/profit-tax";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const request = await prisma.profitWithdrawalRequest.findFirst({
      where: { id, userId },
      include: { taxPayment: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Profit withdrawal not found" }, { status: 404 });
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

    const spendableBalance = await getSpendableBalance(userId);
    const taxAmount = Number(request.assignedTaxAmount);
    const payment = request.taxPayment;

    return NextResponse.json({
      request: {
        id: request.id,
        amountUsd: Number(request.amountUsd),
        assignedTaxAmount: taxAmount,
        taxPercentage: Number(request.taxPercentage),
        status: request.status,
        statusLabel: formatProfitWithdrawalStatus(request.status),
        referenceId: formatReferenceId(request.id),
        createdAt: request.createdAt.toISOString(),
      },
      taxPayment: payment
        ? {
            id: payment.id,
            status: payment.status,
            statusLabel: formatProfitTaxPaymentStatus(payment.status),
            amountUsd: Number(payment.amountUsd),
            paymentMethod: payment.paymentMethod,
            txHash: payment.txHash,
            proofNote: payment.proofNote,
            hasProofImage: Boolean(payment.proofImage),
            paidAt: payment.paidAt?.toISOString() ?? null,
          }
        : null,
      paymentMethods: {
        bitcoinWalletAddress: depositSettings.bitcoinWalletAddress,
        bitcoinPurchaseLink: depositSettings.bitcoinPurchaseLink,
        depositInstructions: depositSettings.depositInstructions,
        qrCodeDataUrl,
      },
      spendableBalance,
      canPayFromBalance:
        request.status === "AWAITING_TAX_PAYMENT" &&
        !!payment &&
        (payment.status === "UNPAID" || payment.status === "REJECTED") &&
        spendableBalance >= taxAmount,
      canPayExternal:
        request.status === "AWAITING_TAX_PAYMENT" &&
        !!payment &&
        (payment.status === "UNPAID" || payment.status === "REJECTED"),
    });
  } catch (error) {
    console.error("Profit tax GET error:", error);
    return NextResponse.json({ error: "Failed to load tax payment details" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = profitTaxPaymentSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const proofCheck = validateDepositProofImageDataUrl(parsed.data.proofImage);
    if (!proofCheck.ok) {
      return NextResponse.json({ error: proofCheck.error }, { status: 400 });
    }

    const request = await prisma.profitWithdrawalRequest.findFirst({
      where: { id, userId },
      include: { taxPayment: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Profit withdrawal not found" }, { status: 404 });
    }
    if (request.status !== "AWAITING_TAX_PAYMENT") {
      return NextResponse.json({ error: "This withdrawal is not awaiting tax payment" }, { status: 400 });
    }
    if (!request.taxPayment) {
      return NextResponse.json({ error: "Tax payment record not found" }, { status: 400 });
    }
    if (request.taxPayment.status === "PAID") {
      return NextResponse.json({ error: "Tax has already been paid" }, { status: 400 });
    }
    if (request.taxPayment.status === "PENDING_VERIFICATION") {
      return NextResponse.json({ error: "Tax payment is already pending verification" }, { status: 400 });
    }

    const updated = await prisma.profitTaxPayment.update({
      where: { id: request.taxPayment.id },
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
        type: "PROFIT_TAX_SUBMITTED",
        title: "Tax payment submitted",
        message: `Your profit tax payment of ${formatCurrency(amount)} has been submitted for verification.`,
      });
    } catch (notifyError) {
      console.error("Profit tax notification error:", notifyError);
    }

    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      message: "Tax payment proof submitted. An administrator will verify it before releasing your profit.",
      taxPayment: {
        id: updated.id,
        status: updated.status,
        amountUsd: amount,
      },
    });
  } catch (error) {
    console.error("Profit tax POST error:", error);
    return NextResponse.json({ error: "Failed to submit tax payment" }, { status: 500 });
  }
}
