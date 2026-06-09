import { prisma } from "@/lib/prisma";

export async function logAdminAction(
  adminId: string,
  action: string,
  details: Record<string, unknown>,
  targetUserId?: string,
  ipAddress?: string
) {
  return prisma.adminActivityLog.create({
    data: {
      adminId,
      targetUserId,
      action,
      details: JSON.stringify(details),
      ipAddress,
    },
  });
}

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

export async function getAdminAuditLogs(limit = 50) {
  const logs = await prisma.adminActivityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      admin: { select: { id: true, name: true, email: true } },
      targetUser: { select: { id: true, name: true, email: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    details: JSON.parse(l.details) as Record<string, unknown>,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
    admin: l.admin,
    targetUser: l.targetUser,
  }));
}

export async function getBalanceAdjustments(limit = 50, userId?: string) {
  const adjustments = await prisma.balanceAdjustment.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      admin: { select: { id: true, name: true, email: true } },
      account: { select: { id: true, name: true, currency: true } },
    },
  });

  return adjustments.map((a) => ({
    id: a.id,
    type: a.type,
    amount: Number(a.amount),
    reason: a.reason,
    balanceBefore: Number(a.balanceBefore),
    balanceAfter: Number(a.balanceAfter),
    createdAt: a.createdAt.toISOString(),
    user: a.user,
    admin: a.admin,
    account: a.account,
  }));
}
