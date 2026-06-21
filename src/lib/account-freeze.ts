import type { AccountFreezeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";

export type AccountFreezeDto = {
  id: string;
  freezeType: AccountFreezeType;
  freezeTypeLabel: string;
  reason: string;
  internalNotes: string | null;
  frozenAt: string;
  frozenBy: { id: string; name: string; email: string };
};

export const FREEZE_TYPE_LABELS: Record<AccountFreezeType, string> = {
  FULL: "Full Account Freeze",
  WITHDRAWAL_ONLY: "Withdrawal Freeze Only",
};

export async function logFreezeAction(
  userId: string,
  action: string,
  details: Record<string, unknown>,
  adminId?: string,
  ipAddress?: string
) {
  await prisma.accountFreezeLog.create({
    data: {
      userId,
      adminId,
      action,
      details: JSON.stringify(details),
      ipAddress,
    },
  });

  if (adminId) {
    await logAdminAction(adminId, action, details, userId, ipAddress);
  }
}

export async function getActiveAccountFreeze(userId: string) {
  return prisma.accountFreeze.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      frozenBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { frozenAt: "desc" },
  });
}

export async function getAccountFreezeStatus(userId: string): Promise<{
  isFrozen: boolean;
  freeze: AccountFreezeDto | null;
}> {
  const active = await getActiveAccountFreeze(userId);
  if (!active) return { isFrozen: false, freeze: null };

  return {
    isFrozen: true,
    freeze: mapFreezeToDto(active),
  };
}

function mapFreezeToDto(freeze: {
  id: string;
  freezeType: AccountFreezeType;
  reason: string;
  internalNotes: string | null;
  frozenAt: Date;
  frozenBy: { id: string; name: string; email: string };
}): AccountFreezeDto {
  return {
    id: freeze.id,
    freezeType: freeze.freezeType,
    freezeTypeLabel: FREEZE_TYPE_LABELS[freeze.freezeType],
    reason: freeze.reason,
    internalNotes: freeze.internalNotes,
    frozenAt: freeze.frozenAt.toISOString(),
    frozenBy: freeze.frozenBy,
  };
}

export function isWithdrawalBlocked(freezeType: AccountFreezeType | undefined): boolean {
  if (!freezeType) return false;
  return freezeType === "FULL" || freezeType === "WITHDRAWAL_ONLY";
}

export function isTransferBlocked(freezeType: AccountFreezeType | undefined): boolean {
  return freezeType === "FULL";
}

export async function freezeUserAccount(params: {
  userId: string;
  adminId: string;
  freezeType: AccountFreezeType;
  reason: string;
  internalNotes?: string;
  ipAddress?: string;
}) {
  const existing = await getActiveAccountFreeze(params.userId);
  if (existing) {
    throw new Error("Account is already frozen");
  }

  const user = await prisma.user.findFirst({
    where: { id: params.userId, role: "USER" },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const freeze = await prisma.accountFreeze.create({
    data: {
      userId: params.userId,
      freezeType: params.freezeType,
      reason: params.reason.trim(),
      internalNotes: params.internalNotes?.trim() || null,
      frozenById: params.adminId,
    },
    include: {
      frozenBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logFreezeAction(
    params.userId,
    "ACCOUNT_FROZEN",
    {
      freezeId: freeze.id,
      freezeType: params.freezeType,
      reason: params.reason.trim(),
      internalNotes: params.internalNotes?.trim() || null,
    },
    params.adminId,
    params.ipAddress
  );

  try {
    await createUserNotification({
      userId: params.userId,
      type: "ACCOUNT_FROZEN",
      title: "Account Status: Frozen",
      message: `Your account has been frozen. Reason: ${params.reason.trim()}. Withdrawals are temporarily disabled. Contact support if you need assistance.`,
    });
    await sendUserNotificationEmail({
      userId: params.userId,
      title: "Account Status: Frozen",
      message: `Your account has been frozen. Reason: ${params.reason.trim()}. Please contact support for assistance with fund release.`,
    });
  } catch (err) {
    console.error("Freeze notification error:", err);
  }

  return mapFreezeToDto(freeze);
}

export async function unfreezeUserAccount(params: {
  userId: string;
  adminId: string;
  ipAddress?: string;
  notes?: string;
}) {
  const active = await getActiveAccountFreeze(params.userId);
  if (!active) throw new Error("No active freeze on this account");

  await prisma.accountFreeze.update({
    where: { id: active.id },
    data: {
      status: "RELEASED",
      unfrozenById: params.adminId,
      unfrozenAt: new Date(),
    },
  });

  await logFreezeAction(
    params.userId,
    "ACCOUNT_UNFROZEN",
    {
      freezeId: active.id,
      notes: params.notes?.trim() || null,
    },
    params.adminId,
    params.ipAddress
  );

  try {
    await createUserNotification({
      userId: params.userId,
      type: "ACCOUNT_UNFROZEN",
      title: "Account Restored",
      message: "Your account has been unfrozen. Withdrawals and transfers are available again.",
    });
    await sendUserNotificationEmail({
      userId: params.userId,
      title: "Account Restored",
      message: "Your account has been unfrozen. Withdrawals and transfers are available again.",
    });
  } catch (err) {
    console.error("Unfreeze notification error:", err);
  }

  return { success: true };
}

export async function updateFreezeReason(params: {
  freezeId: string;
  adminId: string;
  reason: string;
  internalNotes?: string;
  ipAddress?: string;
}) {
  const freeze = await prisma.accountFreeze.findUnique({
    where: { id: params.freezeId },
    select: { id: true, userId: true, status: true, reason: true, internalNotes: true },
  });
  if (!freeze || freeze.status !== "ACTIVE") throw new Error("Active freeze not found");

  const updated = await prisma.accountFreeze.update({
    where: { id: params.freezeId },
    data: {
      reason: params.reason.trim(),
      internalNotes: params.internalNotes !== undefined ? params.internalNotes.trim() || null : undefined,
    },
    include: {
      frozenBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logFreezeAction(
    freeze.userId,
    "FREEZE_REASON_UPDATED",
    {
      freezeId: freeze.id,
      previousReason: freeze.reason,
      newReason: params.reason.trim(),
      previousInternalNotes: freeze.internalNotes,
      newInternalNotes: params.internalNotes?.trim() || null,
    },
    params.adminId,
    params.ipAddress
  );

  return mapFreezeToDto(updated);
}

export async function getFrozenAccounts(filters?: { search?: string }) {
  const freezes = await prisma.accountFreeze.findMany({
    where: {
      status: "ACTIVE",
      ...(filters?.search
        ? {
            user: {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    orderBy: { frozenAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          accounts: { select: { balance: true } },
        },
      },
      frozenBy: { select: { id: true, name: true, email: true } },
      fundReleaseRequests: {
        where: { status: "PENDING" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return freezes.map((f) => ({
    id: f.id,
    userId: f.user.id,
    userName: f.user.name,
    userEmail: f.user.email,
    userPhone: f.user.phone,
    userStatus: f.user.status,
    totalBalance: f.user.accounts.reduce((s, a) => s + Number(a.balance), 0),
    freezeType: f.freezeType,
    freezeTypeLabel: FREEZE_TYPE_LABELS[f.freezeType],
    reason: f.reason,
    internalNotes: f.internalNotes,
    frozenAt: f.frozenAt.toISOString(),
    frozenBy: f.frozenBy,
    pendingReleaseRequest: f.fundReleaseRequests[0]
      ? {
          id: f.fundReleaseRequests[0].id,
          createdAt: f.fundReleaseRequests[0].createdAt.toISOString(),
        }
      : null,
  }));
}

export async function getAccountFreezeHistory(userId: string, limit = 50) {
  const [freezes, logs] = await Promise.all([
    prisma.accountFreeze.findMany({
      where: { userId },
      orderBy: { frozenAt: "desc" },
      take: limit,
      include: {
        frozenBy: { select: { id: true, name: true, email: true } },
        unfrozenBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.accountFreezeLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    freezes: freezes.map((f) => ({
      id: f.id,
      freezeType: f.freezeType,
      freezeTypeLabel: FREEZE_TYPE_LABELS[f.freezeType],
      reason: f.reason,
      internalNotes: f.internalNotes,
      status: f.status,
      frozenAt: f.frozenAt.toISOString(),
      unfrozenAt: f.unfrozenAt?.toISOString() ?? null,
      frozenBy: f.frozenBy,
      unfrozenBy: f.unfrozenBy,
    })),
    auditLogs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: JSON.parse(l.details) as Record<string, unknown>,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
      admin: l.admin,
    })),
  };
}

export async function ensureFundReleaseRequest(userId: string, userMessage?: string) {
  const active = await getActiveAccountFreeze(userId);
  if (!active) return null;

  const existing = await prisma.fundReleaseRequest.findFirst({
    where: { userId, accountFreezeId: active.id, status: "PENDING" },
  });
  if (existing) {
    if (userMessage && !existing.userMessage) {
      return prisma.fundReleaseRequest.update({
        where: { id: existing.id },
        data: { userMessage: userMessage.trim() },
      });
    }
    return existing;
  }

  const request = await prisma.fundReleaseRequest.create({
    data: {
      userId,
      accountFreezeId: active.id,
      userMessage: userMessage?.trim() || null,
    },
  });

  await logFreezeAction(userId, "FUND_RELEASE_REQUESTED", {
    requestId: request.id,
    freezeId: active.id,
    userMessage: userMessage?.trim() || null,
  });

  return request;
}

export async function recordUserContactedSupport(userId: string, message?: string) {
  const active = await getActiveAccountFreeze(userId);
  if (!active) return;

  await logFreezeAction(userId, "USER_CONTACTED_SUPPORT", {
    freezeId: active.id,
    messagePreview: message?.trim().slice(0, 200) || null,
  });

  await ensureFundReleaseRequest(userId, message);
}

export async function getFundReleaseRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const requests = await prisma.fundReleaseRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          accounts: { select: { balance: true } },
        },
      },
      accountFreeze: {
        select: {
          id: true,
          freezeType: true,
          reason: true,
          internalNotes: true,
          frozenAt: true,
          frozenBy: { select: { id: true, name: true, email: true } },
        },
      },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return requests.map((r) => ({
    id: r.id,
    status: r.status,
    userMessage: r.userMessage,
    adminNotes: r.adminNotes,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      phone: r.user.phone,
      totalBalance: r.user.accounts.reduce((s, a) => s + Number(a.balance), 0),
    },
    freeze: {
      id: r.accountFreeze.id,
      freezeType: r.accountFreeze.freezeType,
      freezeTypeLabel: FREEZE_TYPE_LABELS[r.accountFreeze.freezeType],
      reason: r.accountFreeze.reason,
      internalNotes: r.accountFreeze.internalNotes,
      frozenAt: r.accountFreeze.frozenAt.toISOString(),
      frozenBy: r.accountFreeze.frozenBy,
    },
    reviewedBy: r.reviewedBy,
  }));
}

export async function reviewFundReleaseRequest(params: {
  requestId: string;
  adminId: string;
  action: "APPROVE" | "REJECT";
  adminNotes?: string;
  ipAddress?: string;
}) {
  const request = await prisma.fundReleaseRequest.findUnique({
    where: { id: params.requestId },
    include: {
      accountFreeze: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!request) throw new Error("Fund release request not found");
  if (request.status !== "PENDING") throw new Error("Request has already been reviewed");
  if (request.accountFreeze.status !== "ACTIVE") {
    throw new Error("Associated freeze is no longer active");
  }

  const now = new Date();

  if (params.action === "APPROVE") {
    await prisma.$transaction([
      prisma.fundReleaseRequest.update({
        where: { id: params.requestId },
        data: {
          status: "APPROVED",
          adminNotes: params.adminNotes?.trim() || null,
          reviewedById: params.adminId,
          reviewedAt: now,
        },
      }),
      prisma.accountFreeze.update({
        where: { id: request.accountFreezeId },
        data: {
          status: "RELEASED",
          unfrozenById: params.adminId,
          unfrozenAt: now,
        },
      }),
    ]);

    await logFreezeAction(
      request.userId,
      "ACCOUNT_UNFROZEN",
      {
        freezeId: request.accountFreezeId,
        viaFundRelease: true,
        requestId: params.requestId,
        adminNotes: params.adminNotes?.trim() || null,
      },
      params.adminId,
      params.ipAddress
    );

    try {
      await createUserNotification({
        userId: request.userId,
        type: "FUND_RELEASE_APPROVED",
        title: "Fund Release Approved",
        message:
          "Your fund release request has been approved. Your account is now active and withdrawals are available again.",
      });
      await sendUserNotificationEmail({
        userId: request.userId,
        title: "Fund Release Approved",
        message:
          "Your fund release request has been approved. Your account is now active and withdrawals are available again.",
      });
    } catch (err) {
      console.error("Fund release approval notification error:", err);
    }
  } else {
    await prisma.fundReleaseRequest.update({
      where: { id: params.requestId },
      data: {
        status: "REJECTED",
        adminNotes: params.adminNotes?.trim() || null,
        reviewedById: params.adminId,
        reviewedAt: now,
      },
    });

    await logFreezeAction(
      request.userId,
      "FUND_RELEASE_REJECTED",
      {
        requestId: params.requestId,
        freezeId: request.accountFreezeId,
        adminNotes: params.adminNotes?.trim() || null,
      },
      params.adminId,
      params.ipAddress
    );

    try {
      await createUserNotification({
        userId: request.userId,
        type: "FUND_RELEASE_REJECTED",
        title: "Fund Release Request Update",
        message:
          params.adminNotes?.trim() ||
          "Your fund release request was not approved at this time. Please contact support for more information.",
      });
      await sendUserNotificationEmail({
        userId: request.userId,
        title: "Fund Release Request Update",
        message:
          params.adminNotes?.trim() ||
          "Your fund release request was not approved at this time. Please contact support for more information.",
      });
    } catch (err) {
      console.error("Fund release rejection notification error:", err);
    }
  }

  return { success: true };
}

export async function getPendingFundReleaseCount(): Promise<number> {
  try {
    return await prisma.fundReleaseRequest.count({ where: { status: "PENDING" } });
  } catch {
    return 0;
  }
}
