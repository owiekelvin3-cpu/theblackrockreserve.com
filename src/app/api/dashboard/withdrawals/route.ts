import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getAvailableBalancesMap } from "@/lib/withdrawal-balance";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { getActiveUserWithdrawalCharge, formatWithdrawalStatus, formatChargePaymentStatus } from "@/lib/withdrawal-charge";
import { getPublicDepositSettings } from "@/lib/platform-settings";
import { withdrawalRequestSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const [accounts, withdrawals, userCharge, depositSettings] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId },
        select: { id: true, name: true, currency: true, balance: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          accountId: true,
          method: true,
          amountUsd: true,
          assignedChargeAmount: true,
          destination: true,
          destinationExtra: true,
          note: true,
          status: true,
          reviewNote: true,
          createdAt: true,
          chargePayment: {
            select: {
              id: true,
              status: true,
              amountUsd: true,
              paymentMethod: true,
              txHash: true,
              proofNote: true,
              paidAt: true,
              createdAt: true,
            },
          },
        },
      }),
      getActiveUserWithdrawalCharge(userId),
      getPublicDepositSettings(),
    ]);

    const availableMap = await getAvailableBalancesMap(userId, accounts);

    let chargeQrCodeDataUrl = "";
    if (depositSettings.bitcoinWalletAddress) {
      try {
        chargeQrCodeDataUrl = await QRCode.toDataURL(`bitcoin:${depositSettings.bitcoinWalletAddress}`, {
          width: 200,
          margin: 2,
          color: { dark: "#FF5F05", light: "#0F0F0F" },
        });
      } catch {
        /* ignore qr errors */
      }
    }

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        balance: Number(a.balance),
        availableBalance: availableMap[a.id] ?? Number(a.balance),
      })),
      userCharge: userCharge
        ? { amountUsd: userCharge.amountUsd, updatedAt: userCharge.updatedAt.toISOString() }
        : null,
      chargePaymentMethods: {
        bitcoinWalletAddress: depositSettings.bitcoinWalletAddress,
        bitcoinPurchaseLink: depositSettings.bitcoinPurchaseLink,
        depositInstructions: depositSettings.depositInstructions,
        qrCodeDataUrl: chargeQrCodeDataUrl,
      },
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        accountId: w.accountId,
        method: w.method,
        methodLabel: getWithdrawalMethodLabel(w.method),
        amountUsd: Number(w.amountUsd),
        assignedChargeAmount: w.assignedChargeAmount != null ? Number(w.assignedChargeAmount) : null,
        destination: w.destination,
        destinationExtra: w.destinationExtra,
        note: w.note,
        status: w.status,
        statusLabel: formatWithdrawalStatus(w.status),
        reviewNote: w.reviewNote,
        createdAt: w.createdAt.toISOString(),
        chargePayment: w.chargePayment
          ? {
              id: w.chargePayment.id,
              status: w.chargePayment.status,
              statusLabel: formatChargePaymentStatus(w.chargePayment.status),
              amountUsd: Number(w.chargePayment.amountUsd),
              paymentMethod: w.chargePayment.paymentMethod,
              txHash: w.chargePayment.txHash,
              proofNote: w.chargePayment.proofNote,
              paidAt: w.chargePayment.paidAt?.toISOString() ?? null,
              createdAt: w.chargePayment.createdAt.toISOString(),
            }
          : null,
      })),
      confirmationMessage:
        "Your withdrawal request has been submitted. Our team will review and process it according to your selected payout method.",
    });
  } catch (error) {
    console.error("Withdrawals GET error:", error);
    return NextResponse.json({ error: "Failed to load withdrawal info" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = withdrawalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const account = await prisma.bankAccount.findFirst({
      where: { id: parsed.data.accountId, userId },
      select: { id: true, balance: true, user: { select: { status: true, name: true } } },
    });
    if (!account) return NextResponse.json({ error: "Invalid account" }, { status: 400 });
    if (account.user.status === "SUSPENDED") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const availableMap = await getAvailableBalancesMap(userId, [account]);
    const available = availableMap[account.id] ?? 0;

    if (parsed.data.amountUsd > available) {
      return NextResponse.json(
        { error: `Insufficient available balance. You can withdraw up to $${available.toFixed(2)} (pending requests are reserved).` },
        { status: 400 }
      );
    }

    const needsExtra = ["ACH", "WIRE", "DEBIT_CARD", "PAPER_CHECK"].includes(parsed.data.method);
    if (needsExtra && !parsed.data.destinationExtra?.trim()) {
      const labels: Record<string, string> = {
        ACH: "Routing number is required for ACH",
        WIRE: "Wire details are required",
        DEBIT_CARD: "Name on card is required",
        PAPER_CHECK: "Mailing address is required",
      };
      return NextResponse.json({ error: labels[parsed.data.method] ?? "Additional details required" }, { status: 400 });
    }

    const activeCharge = await getActiveUserWithdrawalCharge(userId);
    if (activeCharge && !parsed.data.chargeAcknowledged) {
      return NextResponse.json({
        requiresChargeAcknowledgment: true,
        chargeAmount: activeCharge.amountUsd,
        message:
          "A withdrawal processing charge applies to your account. Acknowledge the charge to continue.",
      });
    }

    const hasCharge = !!activeCharge;
    const chargeAmount = activeCharge?.amountUsd ?? null;

    const withdrawal = await prisma.$transaction(async (tx) => {
      const created = await tx.withdrawalRequest.create({
        data: {
          userId,
          userNameSnapshot: account.user.name,
          accountId: parsed.data.accountId,
          method: parsed.data.method,
          amountUsd: parsed.data.amountUsd,
          assignedChargeAmount: chargeAmount,
          destination: parsed.data.destination.trim(),
          destinationExtra: parsed.data.destinationExtra?.trim() || null,
          note: parsed.data.note?.trim() || null,
          status: hasCharge ? "AWAITING_CHARGE_PAYMENT" : "PENDING",
        },
        select: { id: true, method: true, status: true, createdAt: true, assignedChargeAmount: true },
      });

      if (hasCharge && chargeAmount) {
        await tx.withdrawalChargePayment.create({
          data: {
            userId,
            withdrawalRequestId: created.id,
            amountUsd: chargeAmount,
            paymentMethod: "BITCOIN",
            status: "UNPAID",
          },
        });
      }

      return created;
    });

    const title = hasCharge ? "Withdrawal awaiting charge payment" : "Withdrawal request submitted";
    const message = hasCharge
      ? `Your ${getWithdrawalMethodLabel(parsed.data.method)} withdrawal for ${formatCurrency(parsed.data.amountUsd)} was received. Pay the ${formatCurrency(chargeAmount!)} processing charge via a new deposit before it can be reviewed.`
      : `Your ${getWithdrawalMethodLabel(parsed.data.method)} withdrawal request for ${formatCurrency(parsed.data.amountUsd)} has been submitted and is pending review.`;

    await createUserNotification({
      userId,
      type: hasCharge ? "WITHDRAWAL_CHARGE_REQUIRED" : "WITHDRAWAL_SUBMITTED",
      title,
      message,
    });

    await sendUserNotificationEmail({ userId, title, message });

    return NextResponse.json({
      success: true,
      requiresChargePayment: hasCharge,
      chargeAmount: chargeAmount,
      message: hasCharge
        ? `Withdrawal submitted. A processing charge of ${formatCurrency(chargeAmount!)} must be paid via a new deposit before your request can be processed.`
        : "Your withdrawal request has been submitted. Our team will review and process it according to your selected payout method.",
      withdrawal: {
        id: withdrawal.id,
        method: withdrawal.method,
        status: withdrawal.status,
        statusLabel: formatWithdrawalStatus(withdrawal.status),
        assignedChargeAmount: withdrawal.assignedChargeAmount != null ? Number(withdrawal.assignedChargeAmount) : null,
        createdAt: withdrawal.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Withdrawals POST error:", error);
    return NextResponse.json({ error: "Failed to submit withdrawal request" }, { status: 500 });
  }
}
