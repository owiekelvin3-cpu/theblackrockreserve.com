import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  depositApprovedEmail,
  depositRejectedEmail,
  investmentConfirmationEmail,
} from "@/lib/email-templates";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { getSiteUrl } from "@/lib/site-url";
import {
  isEmailEnabledForCategory,
  parseNotificationPrefs,
  type NotificationEmailCategory,
} from "@/lib/notification-prefs";

/** In-app notification + email for any money-related customer event */
export async function notifyMoneyEvent(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  depositId?: string;
  jointAccountId?: string;
  category?: NotificationEmailCategory;
}) {
  await createUserNotification({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    depositId: params.depositId,
    jointAccountId: params.jointAccountId,
  });
  await sendUserNotificationEmail({
    userId: params.userId,
    title: params.title,
    message: params.message,
    category: params.category ?? "transactions",
  });
}

export async function sendInvestmentConfirmationEmail(params: {
  userId: string;
  symbol: string;
  assetName: string;
  amountUsd: number;
  shares: number;
  fee: number;
  totalCost: number;
  newBalance: number;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true, notificationPrefs: true },
  });
  if (!user?.email) return;

  const prefs = parseNotificationPrefs(user.notificationPrefs);
  if (!isEmailEnabledForCategory(prefs, "investments")) {
    await createUserNotification({
      userId: params.userId,
      type: "INVESTMENT",
      title: "Investment confirmed",
      message: `Your investment in ${params.symbol} has been executed.`,
    });
    return;
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const title = "Investment confirmed";
  const message = `Your investment of ${fmt(params.amountUsd)} in ${params.symbol} (${params.assetName}) has been executed. ${fmt(params.totalCost)} was debited from your account.`;

  await createUserNotification({
    userId: params.userId,
    type: "INVESTMENT",
    title,
    message,
  });

  const siteUrl = getSiteUrl();
  const mail = investmentConfirmationEmail({
    name: user.name,
    symbol: params.symbol,
    assetName: params.assetName,
    amountUsd: fmt(params.amountUsd),
    shares: params.shares.toFixed(4),
    fee: fmt(params.fee),
    totalCost: fmt(params.totalCost),
    newBalance: fmt(params.newBalance),
    siteUrl,
  });

  try {
    await sendEmail({ to: user.email, ...mail });
  } catch (error) {
    console.error("Investment confirmation email failed:", error);
    await sendUserNotificationEmail({
      userId: params.userId,
      title,
      message,
      category: "investments",
    });
  }
}

export async function sendDepositDecisionEmail(params: {
  userId: string;
  approved: boolean;
  amountLabel: string;
  reason?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true, notificationPrefs: true },
  });
  if (!user?.email) return;

  const prefs = parseNotificationPrefs(user.notificationPrefs);
  if (!isEmailEnabledForCategory(prefs, "transactions")) return;

  const siteUrl = getSiteUrl();

  try {
    if (params.approved) {
      const mail = depositApprovedEmail({
        name: user.name,
        amount: params.amountLabel,
        siteUrl,
      });
      await sendEmail({ to: user.email, ...mail });
      return;
    }

    const mail = depositRejectedEmail({
      name: user.name,
      reason: params.reason ?? "Please contact support for assistance.",
      siteUrl,
    });
    await sendEmail({ to: user.email, ...mail });
  } catch (error) {
    console.error("Deposit decision email failed:", error);
    const title = params.approved ? "Deposit approved" : "Deposit could not be processed";
    const message = params.approved
      ? `Your deposit of ${params.amountLabel} has been credited to your account.`
      : `We were unable to confirm your recent deposit. ${params.reason ?? "Please contact support."}`;
    await sendUserNotificationEmail({
      userId: params.userId,
      title,
      message,
      category: "transactions",
    });
  }
}

export async function sendBrandedMoneyEmail(params: {
  userId: string;
  title: string;
  message: string;
  category?: NotificationEmailCategory;
}) {
  await sendUserNotificationEmail({
    userId: params.userId,
    title: params.title,
    message: params.message,
    category: params.category ?? "transactions",
  });
}
