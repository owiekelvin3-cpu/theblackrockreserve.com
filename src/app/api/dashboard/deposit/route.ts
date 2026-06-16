import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { DEPOSIT_SUCCESS_MESSAGE, formatDepositStatus } from "@/lib/deposit-status";
import { getPublicDepositSettings } from "@/lib/platform-settings";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import { depositSubmitSchema } from "@/lib/validations";
import { validateDepositProofImageDataUrl } from "@/lib/deposit-proof-image";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { createDepositRequest, listUserDepositRequests } from "@/lib/deposit-request-data";
import QRCode from "qrcode";

const getBitcoinQr = unstable_cache(
  async (address: string) =>
    QRCode.toDataURL(`bitcoin:${address}`, {
      width: 220,
      margin: 2,
      color: { dark: "#FF5F05", light: "#0F0F0F" },
    }),
  ["bitcoin-wallet-qr"],
  { revalidate: 3600, tags: ["platform-settings"] }
);

function resolveSuccessMessage(settingsMessage: string) {
  const trimmed = settingsMessage?.trim();
  return trimmed || DEPOSIT_SUCCESS_MESSAGE;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const settings = await getPublicDepositSettings();
    const [accounts, deposits] = await Promise.all([
      ensureUserBankAccounts(userId),
      listUserDepositRequests(userId),
    ]);

    let qrCodeDataUrl = "";
    if (settings.bitcoinWalletAddress) {
      try {
        qrCodeDataUrl = await getBitcoinQr(settings.bitcoinWalletAddress);
      } catch (qrError) {
        console.error("QR code generation failed:", qrError);
      }
    }

    const successMessage = resolveSuccessMessage(settings.depositConfirmationMessage);

    return NextResponse.json({
      ...settings,
      qrCodeDataUrl,
      successMessage,
      accounts: accounts.map((a) => ({
        ...a,
        balance: Number(a.balance),
      })),
      deposits: deposits.map((d) => ({
        id: d.id,
        amountUsd: d.amountUsd ? Number(d.amountUsd) : null,
        bitcoinWalletAddress: d.bitcoinWalletAddress,
        txHash: d.txHash,
        hasProofImage: Boolean(d.proofImage),
        proofNote: d.proofNote,
        status: d.status,
        statusLabel: formatDepositStatus(d.status),
        reviewNote: d.reviewNote,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Deposit GET error:", error);
    return NextResponse.json({ error: "Failed to load deposit info" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = depositSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const [user, settings] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true, name: true } }),
      getPublicDepositSettings(),
    ]);

    if (!user || user.status === "SUSPENDED") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }
    if (!settings.bitcoinWalletAddress) {
      return NextResponse.json({ error: "Bitcoin deposits are not configured" }, { status: 400 });
    }

    await ensureUserBankAccounts(userId);

    const account = await prisma.bankAccount.findFirst({
      where: parsed.data.accountId
        ? { id: parsed.data.accountId, userId }
        : { userId },
      orderBy: { createdAt: "asc" },
    });
    if (!account) {
      return NextResponse.json({ error: "No bank account available to credit" }, { status: 400 });
    }

    const proofCheck = validateDepositProofImageDataUrl(parsed.data.proofImage);
    if (!proofCheck.ok) {
      return NextResponse.json({ error: proofCheck.error }, { status: 400 });
    }

    const amountLabel = formatCurrency(parsed.data.amountUsd);

    const depositTitle = "Deposit request submitted";
    const depositMessage = `Your Bitcoin deposit request (${amountLabel}) is pending admin approval. You will be notified once it is reviewed.`;

    const deposit = await runInteractiveTransaction(async (tx) => {
      const row = await createDepositRequest(
        {
          userId,
          accountId: account.id,
          amountUsd: parsed.data.amountUsd,
          bitcoinWalletAddress: settings.bitcoinWalletAddress,
          proofImage: parsed.data.proofImage,
          proofNote: parsed.data.proofNote?.trim() || null,
        },
        tx
      );

      await createUserNotification(
        {
          userId,
          type: "DEPOSIT_SUBMITTED",
          title: depositTitle,
          message: depositMessage,
          depositId: row.id,
        },
        tx
      );

      return row;
    });

    await sendUserNotificationEmail({
      userId,
      title: depositTitle,
      message: depositMessage,
    });

    return NextResponse.json({
      success: true,
      title: "Deposit Request Submitted Successfully",
      message: `We have received your deposit request for ${amountLabel}. Our team will verify your payment proof and notify you once the funds are credited to your account.`,
      amountUsd: parsed.data.amountUsd,
      amountLabel,
      statusLabel: formatDepositStatus("PENDING"),
      deposit: {
        id: deposit.id,
        status: deposit.status,
        statusLabel: formatDepositStatus(deposit.status),
        amountUsd: deposit.amountUsd ? Number(deposit.amountUsd) : null,
        bitcoinWalletAddress: deposit.bitcoinWalletAddress,
        hasProofImage: Boolean(deposit.proofImage),
        createdAt: deposit.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Deposit POST error:", error);
    return NextResponse.json({ error: "Failed to submit deposit request" }, { status: 500 });
  }
}
