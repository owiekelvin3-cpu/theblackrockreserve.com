import type { VerificationBadgeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registeredCustomerWhere } from "@/lib/customer-auth";
import { getVerificationBadgeAction, serializeVerificationBadge } from "@/lib/verification-badge";
import {
  isVerificationSchemaError,
  verificationSchemaErrorMessage,
} from "@/lib/verification-badge-schema";

export type VerificationBadgeUserRow = {
  id: string;
  name: string;
  email: string;
  accountType: string;
  verificationBadge: VerificationBadgeType;
  verificationBadgeAt: string | null;
  grantedBy: { id: string; name: string; email: string } | null;
  createdAt: string;
};

export type VerificationBadgeHistoryRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  badgeType: VerificationBadgeType;
  action: string;
  previousBadge: VerificationBadgeType | null;
  admin: { id: string; name: string; email: string };
  note: string | null;
  createdAt: string;
};

export type VerificationBadgeStats = {
  totalUsers: number;
  verifiedUsers: number;
};

function buildUserWhere(filters?: {
  search?: string;
  badgeType?: VerificationBadgeType;
  verifiedOnly?: boolean;
}) {
  const badgeWhere = filters?.verifiedOnly
    ? { verificationBadge: { not: "NONE" as const } }
    : filters?.badgeType
      ? { verificationBadge: filters.badgeType }
      : {};

  return {
    ...registeredCustomerWhere,
    ...badgeWhere,
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function getVerificationBadgeStats(): Promise<VerificationBadgeStats> {
  const [totalUsers, verifiedUsers] = await Promise.all([
    prisma.user.count({ where: registeredCustomerWhere }),
    prisma.user.count({
      where: { ...registeredCustomerWhere, verificationBadge: { not: "NONE" } },
    }),
  ]);
  return { totalUsers, verifiedUsers };
}

export async function getVerificationBadgeUsers(filters?: {
  search?: string;
  badgeType?: VerificationBadgeType;
  verifiedOnly?: boolean;
}) {
  const users = await prisma.user.findMany({
    where: buildUserWhere(filters),
    orderBy: [{ verificationBadge: "desc" }, { verificationBadgeAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      verificationBadge: true,
      verificationBadgeAt: true,
      createdAt: true,
      verificationBadgeBy: { select: { id: true, name: true, email: true } },
    },
  });

  return users.map(
    (u): VerificationBadgeUserRow => ({
      id: u.id,
      name: u.name,
      email: u.email,
      accountType: u.accountType,
      verificationBadge: u.verificationBadge,
      verificationBadgeAt: u.verificationBadgeAt?.toISOString() ?? null,
      grantedBy: u.verificationBadgeBy,
      createdAt: u.createdAt.toISOString(),
    })
  );
}

export async function getVerificationBadgeHistory(limit = 50, userId?: string) {
  const rows = await prisma.verificationBadgeHistory.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      admin: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map(
    (r): VerificationBadgeHistoryRow => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      badgeType: r.badgeType,
      action: r.action,
      previousBadge: r.previousBadge,
      admin: r.admin,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })
  );
}

export async function setUserVerificationBadge(params: {
  userId: string;
  badgeType: VerificationBadgeType;
  adminId: string;
  note?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, verificationBadge: true },
  });

  if (!user || user.role === "ADMIN") {
    throw new Error("User not found");
  }

  const previousBadge = serializeVerificationBadge(user.verificationBadge);
  const nextBadge = serializeVerificationBadge(params.badgeType);

  if (previousBadge === nextBadge) {
    return prisma.user.findUniqueOrThrow({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        verificationBadge: true,
        verificationBadgeAt: true,
        verificationBadgeBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  const action = getVerificationBadgeAction(previousBadge, nextBadge);
  const now = new Date();

  try {
    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: params.userId },
        data: {
          verificationBadge: nextBadge,
          verificationBadgeAt: nextBadge === "NONE" ? null : now,
          verificationBadgeById: nextBadge === "NONE" ? null : params.adminId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          verificationBadge: true,
          verificationBadgeAt: true,
          verificationBadgeBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.verificationBadgeHistory.create({
        data: {
          userId: params.userId,
          badgeType: nextBadge,
          action,
          previousBadge: previousBadge === "NONE" ? null : previousBadge,
          adminId: params.adminId,
          note: params.note?.trim() || null,
        },
      }),
    ]);

    return updated;
  } catch (error) {
    if (isVerificationSchemaError(error)) {
      throw new Error(verificationSchemaErrorMessage());
    }
    throw error;
  }
}

export function mapVerificationServiceError(error: unknown): string {
  if (isVerificationSchemaError(error)) {
    return verificationSchemaErrorMessage();
  }
  return error instanceof Error ? error.message : "Failed to load verification badges";
}
