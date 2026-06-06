import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getAvailableBalancesMap } from "@/lib/withdrawal-balance";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { withdrawalRequestSchema } from "@/lib/validations";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const [accounts, withdrawals] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { userId },
        select: { id: true, name: true, currency: true, balance: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          accountId: true,
          method: true,
          amountUsd: true,
          destination: true,
          destinationExtra: true,
          note: true,
          status: true,
          reviewNote: true,
          createdAt: true,
        },
      }),
    ]);

    const availableMap = await getAvailableBalancesMap(userId, accounts);

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        balance: Number(a.balance),
        availableBalance: availableMap[a.id] ?? Number(a.balance),
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        accountId: w.accountId,
        method: w.method,
        methodLabel: getWithdrawalMethodLabel(w.method),
        amountUsd: Number(w.amountUsd),
        destination: w.destination,
        destinationExtra: w.destinationExtra,
        note: w.note,
        status: w.status,
        reviewNote: w.reviewNote,
        createdAt: w.createdAt.toISOString(),
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

    const account = await prisma.bankAccount.findFirst({
      where: { id: parsed.data.accountId, userId },
      select: { id: true, balance: true, user: { select: { status: true } } },
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

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId,
        accountId: parsed.data.accountId,
        method: parsed.data.method,
        amountUsd: parsed.data.amountUsd,
        destination: parsed.data.destination.trim(),
        destinationExtra: parsed.data.destinationExtra?.trim() || null,
        note: parsed.data.note?.trim() || null,
        status: "PENDING",
      },
      select: { id: true, method: true, status: true, createdAt: true },
    });

    const title = "Withdrawal request submitted";
    const message = `Your ${getWithdrawalMethodLabel(parsed.data.method)} withdrawal request for ${formatCurrency(parsed.data.amountUsd)} has been submitted and is pending review.`;

    await createUserNotification({
      userId,
      type: "WITHDRAWAL_SUBMITTED",
      title,
      message,
    });

    await sendUserNotificationEmail({ userId, title, message });

    return NextResponse.json({
      success: true,
      message:
        "Your withdrawal request has been submitted. Our team will review and process it according to your selected payout method.",
      withdrawal: {
        id: withdrawal.id,
        method: withdrawal.method,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Withdrawals POST error:", error);
    return NextResponse.json({ error: "Failed to submit withdrawal request" }, { status: 500 });
  }
}
