import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { userNotificationEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";

type Tx = Prisma.TransactionClient;

export async function createUserNotification(
  params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    depositId?: string;
    invitationId?: string;
    jointAccountId?: string;
    approvalId?: string;
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
      depositId: params.depositId,
      invitationId: params.invitationId,
      jointAccountId: params.jointAccountId,
      approvalId: params.approvalId,
    },
  });
}

/** Sends the same notification copy to the user's registered Gmail */
export async function sendUserNotificationEmail(params: {
  userId: string;
  title: string;
  message: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, name: true },
  });

  if (!user?.email) return { sent: false as const, reason: "no_email" as const };

  try {
    const mail = userNotificationEmail({
      name: user.name,
      title: params.title,
      message: params.message,
      siteUrl: getSiteUrl(),
    });
    return await sendEmail({ to: user.email, ...mail });
  } catch (error) {
    console.error("User notification email failed:", error);
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

  return rows.map((n) => ({
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
  }));
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
