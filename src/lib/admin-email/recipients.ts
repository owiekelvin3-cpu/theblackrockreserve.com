import type { EmailRecipientFilter } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RecipientUser = {
  id: string;
  email: string;
  name: string;
};

export async function resolveBroadcastRecipients(
  filter: EmailRecipientFilter,
  recipientIds: string[] = []
): Promise<RecipientUser[]> {
  const baseWhere = {
    role: "USER" as const,
    email: { not: "" },
  };

  switch (filter) {
    case "ALL":
      return prisma.user.findMany({
        where: baseWhere,
        select: { id: true, email: true, name: true },
        orderBy: { createdAt: "desc" },
      });
    case "ACTIVE":
      return prisma.user.findMany({
        where: { ...baseWhere, status: "ACTIVE" },
        select: { id: true, email: true, name: true },
        orderBy: { name: "asc" },
      });
    case "SELECTED":
      if (recipientIds.length === 0) return [];
      return prisma.user.findMany({
        where: { ...baseWhere, id: { in: recipientIds } },
        select: { id: true, email: true, name: true },
        orderBy: { name: "asc" },
      });
    case "VERIFIED":
      return prisma.user.findMany({
        where: { ...baseWhere, emailVerified: { not: null } },
        select: { id: true, email: true, name: true },
        orderBy: { name: "asc" },
      });
    case "WITH_INVESTMENTS":
      return prisma.user.findMany({
        where: {
          ...baseWhere,
          investments: { some: {} },
        },
        select: { id: true, email: true, name: true },
        orderBy: { name: "asc" },
      });
    case "PENDING_KYC":
      return prisma.user.findMany({
        where: {
          ...baseWhere,
          kycStatus: { in: ["PENDING", "SUBMITTED"] },
        },
        select: { id: true, email: true, name: true },
        orderBy: { name: "asc" },
      });
    default:
      return [];
  }
}

export async function countBroadcastRecipients(
  filter: EmailRecipientFilter,
  recipientIds: string[] = []
): Promise<number> {
  const users = await resolveBroadcastRecipients(filter, recipientIds);
  return users.length;
}
