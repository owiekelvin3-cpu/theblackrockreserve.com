import type { EmailRecipientFilter, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clampAdminListLimit } from "@/lib/db-list-limits";

export type RecipientUser = {
  id: string;
  email: string;
  name: string;
};

const RECIPIENT_SELECT = { id: true, email: true, name: true } as const;

function baseRecipientWhere(): Prisma.UserWhereInput {
  return {
    role: "USER",
    email: { not: "" },
  };
}

function recipientWhere(
  filter: EmailRecipientFilter,
  recipientIds: string[] = []
): Prisma.UserWhereInput {
  const baseWhere = baseRecipientWhere();

  switch (filter) {
    case "ALL":
      return baseWhere;
    case "ACTIVE":
      return { ...baseWhere, status: "ACTIVE" };
    case "SELECTED":
      return recipientIds.length > 0
        ? { ...baseWhere, id: { in: recipientIds } }
        : { id: { in: [] } };
    case "VERIFIED":
      return { ...baseWhere, emailVerified: { not: null } };
    case "WITH_INVESTMENTS":
      return { ...baseWhere, investments: { some: {} } };
    case "PENDING_KYC":
      return { ...baseWhere, kycStatus: { in: ["PENDING", "SUBMITTED"] } };
    default:
      return { id: { in: [] } };
  }
}

export async function countBroadcastRecipients(
  filter: EmailRecipientFilter,
  recipientIds: string[] = []
): Promise<number> {
  if (filter === "SELECTED" && recipientIds.length === 0) return 0;
  return prisma.user.count({ where: recipientWhere(filter, recipientIds) });
}

/** Paginated recipient load for broadcasts — avoids loading the entire user table at once. */
export async function loadBroadcastRecipientBatch(
  filter: EmailRecipientFilter,
  recipientIds: string[] = [],
  skip = 0,
  take = 100
): Promise<RecipientUser[]> {
  if (filter === "SELECTED" && recipientIds.length === 0) return [];

  const where = recipientWhere(filter, recipientIds);
  const orderBy =
    filter === "ALL"
      ? ({ createdAt: "desc" } as const)
      : ({ name: "asc" } as const);

  return prisma.user.findMany({
    where,
    select: RECIPIENT_SELECT,
    orderBy,
    skip,
    take: clampAdminListLimit(take),
  });
}

/** @deprecated Prefer countBroadcastRecipients + loadBroadcastRecipientBatch for large lists. */
export async function resolveBroadcastRecipients(
  filter: EmailRecipientFilter,
  recipientIds: string[] = []
): Promise<RecipientUser[]> {
  const total = await countBroadcastRecipients(filter, recipientIds);
  if (total === 0) return [];

  const batchSize = 100;
  const recipients: RecipientUser[] = [];
  for (let skip = 0; skip < total; skip += batchSize) {
    const batch = await loadBroadcastRecipientBatch(filter, recipientIds, skip, batchSize);
    recipients.push(...batch);
    if (batch.length < batchSize) break;
  }
  return recipients;
}
