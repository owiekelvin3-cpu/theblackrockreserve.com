import { NextRequest, NextResponse } from "next/server";
import { EmailDeliveryStatus, EmailSendType } from "@prisma/client";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") as EmailDeliveryStatus | "ALL" | null;
  const sendType = searchParams.get("sendType") as EmailSendType | "ALL" | null;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? 25)));
  const skip = (page - 1) * limit;

  const where = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(sendType && sendType !== "ALL" ? { sendType } : {}),
    ...(q
      ? {
          OR: [
            { to: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
            { recipientUser: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sentBy: { select: { id: true, name: true, email: true } },
        recipientUser: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.emailLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      to: log.to,
      subject: log.subject,
      status: log.status,
      sendType: log.sendType,
      failureReason: log.failureReason,
      scheduledAt: log.scheduledAt?.toISOString() ?? null,
      sentAt: log.sentAt?.toISOString() ?? null,
      createdAt: log.createdAt.toISOString(),
      sentBy: log.sentBy,
      recipient: log.recipientUser,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
