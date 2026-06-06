import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function createUserNotification(
  params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    depositId?: string;
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
    },
  });
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
