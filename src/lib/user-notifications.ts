import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { userNotificationEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { parseMemberTransferSenderName } from "@/lib/transaction-counterparty";
import { serializeVerificationBadge } from "@/lib/verification-badge";
import {
  isEmailEnabledForCategory,
  parseNotificationPrefs,
  type NotificationEmailCategory,
} from "@/lib/notification-prefs";

type Tx = Prisma.TransactionClient;

export type { NotificationEmailCategory };

export async function createUserNotification(
  params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actorUserId?: string;
    depositId?: string;
    invitationId?: string;
    jointAccountId?: string;
    approvalId?: string;
    taxRefundId?: string;
    loanApplicationId?: string;
  },
  txClient?: Tx
) {
  const client = txClient ?? prisma;
  return client.userNotification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actorUserId: params.actorUserId ?? null,
      depositId: params.depositId,
      invitationId: params.invitationId,
      jointAccountId: params.jointAccountId,
      approvalId: params.approvalId,
      taxRefundId: params.taxRefundId,
      loanApplicationId: params.loanApplicationId,
    },
  });
}

/** Sends the same notification copy to the user's registered email when prefs allow. */
export async function sendUserNotificationEmail(params: {
  userId: string;
  title: string;
  message: string;
  category?: NotificationEmailCategory;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true, notificationPrefs: true },
  });

  if (!user?.email) {
    console.warn(`[email] skipped — no address for user ${params.userId}`);
    return { sent: false as const, reason: "no_email" as const };
  }

  const prefs = parseNotificationPrefs(user.notificationPrefs);
  const category = params.category ?? "transactions";
  if (!isEmailEnabledForCategory(prefs, category)) {
    console.info(`[email] skipped — ${category} disabled for user ${params.userId}`);
    return { sent: false as const, reason: "prefs_disabled" as const };
  }

  try {
    const mail = userNotificationEmail({
      name: user.name,
      title: params.title,
      message: params.message,
      siteUrl: getSiteUrl(),
    });
    const result = await sendEmail({ to: user.email, ...mail });
    console.info(
      `[email] sent to ${user.email} (${category}) via ${result.provider ?? "unknown"}`
    );
    return result;
  } catch (error) {
    console.error(`[email] failed for ${user.email} (${category}):`, error);
    return { sent: false as const, reason: "send_failed" as const };
  }
}

export async function getUserNotifications(userId: string, limit = 20, since?: Date) {
  const rows = await prisma.userNotification.findMany({
    where: {
      userId,
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const senderNames = rows
    .filter((n) => n.type === "MEMBER_TRANSFER" && !n.actorUserId)
    .map((n) => parseMemberTransferSenderName(n.message))
    .filter((name): name is string => !!name);

  const actorIds = Array.from(
    new Set(rows.map((n) => n.actorUserId).filter((id): id is string => !!id))
  );

  const actorsById =
    actorIds.length > 0
      ? new Map(
          (
            await prisma.user.findMany({
              where: { id: { in: actorIds } },
              select: { id: true, name: true, verificationBadge: true },
            })
          ).map((u) => [
            u.id,
            {
              name: u.name,
              verificationBadge: serializeVerificationBadge(u.verificationBadge),
            },
          ])
        )
      : new Map<string, { name: string; verificationBadge: ReturnType<typeof serializeVerificationBadge> }>();

  const sendersByName =
    senderNames.length > 0
      ? new Map(
          (
            await prisma.user.findMany({
              where: { name: { in: Array.from(new Set(senderNames)) }, role: "USER" },
              select: { name: true, verificationBadge: true },
            })
          ).map((u) => [u.name, serializeVerificationBadge(u.verificationBadge)])
        )
      : new Map<string, ReturnType<typeof serializeVerificationBadge>>();

  return rows.map((n) => {
    const actorFromId = n.actorUserId ? actorsById.get(n.actorUserId) : undefined;
    const senderName =
      n.type === "MEMBER_TRANSFER"
        ? actorFromId?.name ?? parseMemberTransferSenderName(n.message)
        : null;
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      depositId: n.depositId,
      invitationId: n.invitationId,
      jointAccountId: n.jointAccountId,
      approvalId: n.approvalId,
      createdAt: n.createdAt.toISOString(),
      actorUserId: n.actorUserId,
      actorName: senderName,
      actorVerificationBadge: senderName
        ? actorFromId?.verificationBadge ?? sendersByName.get(senderName) ?? "NONE"
        : null,
    };
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.userNotification.count({ where: { userId, read: false } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await prisma.userNotification.updateMany({
    where: {
      userId,
      read: false,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });
}