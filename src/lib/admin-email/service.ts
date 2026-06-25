import type {
  EmailBroadcastStatus,
  EmailDeliveryStatus,
  EmailRecipientFilter,
  EmailSendType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { adminComposedEmail } from "@/lib/email-templates";
import { logAdminAction } from "@/lib/admin-audit";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/admin-email/default-templates";
import { resolveBroadcastRecipients } from "@/lib/admin-email/recipients";

const BROADCAST_BATCH_SIZE = 15;
const BROADCAST_BATCH_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDefaultEmailTemplates(adminId?: string) {
  const existing = await prisma.emailTemplate.count();
  if (existing > 0) return;

  await prisma.emailTemplate.createMany({
    data: DEFAULT_EMAIL_TEMPLATES.map((t) => ({
      name: t.name,
      slug: t.slug,
      subject: t.subject,
      htmlBody: t.htmlBody,
      textBody: t.htmlBody.replace(/<[^>]+>/g, ""),
      isDefault: true,
      createdById: adminId ?? null,
    })),
    skipDuplicates: true,
  });
}

export function buildBrandedEmail(recipientName: string, subject: string, bodyHtml: string) {
  return adminComposedEmail({
    recipientName,
    subject,
    bodyHtml,
    preheader: subject,
  });
}

type CreateLogParams = {
  to: string;
  recipientUserId?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  sendType: EmailSendType;
  sentById: string;
  templateId?: string;
  broadcastId?: string;
  scheduledAt?: Date | null;
  status?: EmailDeliveryStatus;
};

export async function createEmailLog(params: CreateLogParams) {
  return prisma.emailLog.create({
    data: {
      to: params.to,
      recipientUserId: params.recipientUserId,
      subject: params.subject,
      htmlBody: params.htmlBody,
      textBody: params.textBody,
      sendType: params.sendType,
      sentById: params.sentById,
      templateId: params.templateId,
      broadcastId: params.broadcastId,
      scheduledAt: params.scheduledAt ?? null,
      status: params.status ?? (params.scheduledAt ? "SCHEDULED" : "PENDING"),
    },
  });
}

export async function deliverEmailLog(logId: string) {
  const log = await prisma.emailLog.findUnique({ where: { id: logId } });
  if (!log) return { sent: false, reason: "not_found" as const };
  if (log.status === "SENT") return { sent: true, reason: "already_sent" as const };

  if (!isEmailConfigured()) {
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: "FAILED",
        failureReason: "SMTP not configured",
      },
    });
    return { sent: false, reason: "not_configured" as const };
  }

  try {
    await sendEmail({
      to: log.to,
      subject: log.subject,
      html: log.htmlBody,
      text: log.textBody ?? log.subject,
    });
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        failureReason: null,
      },
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: "FAILED",
        failureReason: message,
      },
    });
    return { sent: false, reason: message };
  }
}

export async function sendIndividualAdminEmail(params: {
  adminId: string;
  userId: string;
  subject: string;
  bodyHtml: string;
  templateId?: string;
  ipAddress?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user?.email) throw new Error("User not found or has no email");

  const branded = buildBrandedEmail(user.name, params.subject, params.bodyHtml);
  const log = await createEmailLog({
    to: user.email,
    recipientUserId: user.id,
    subject: branded.subject,
    htmlBody: branded.html,
    textBody: branded.text,
    sendType: "INDIVIDUAL",
    sentById: params.adminId,
    templateId: params.templateId,
  });

  const result = await deliverEmailLog(log.id);

  await logAdminAction(
    params.adminId,
    "EMAIL_SENT_INDIVIDUAL",
    {
      emailLogId: log.id,
      recipientUserId: user.id,
      recipientEmail: user.email,
      subject: params.subject,
      sent: result.sent,
    },
    user.id,
    params.ipAddress
  );

  if (!result.sent) {
    throw new Error(typeof result.reason === "string" ? result.reason : "Failed to send email");
  }

  return { logId: log.id, to: user.email };
}

export async function createBroadcast(params: {
  adminId: string;
  subject: string;
  bodyHtml: string;
  recipientFilter: EmailRecipientFilter;
  recipientIds?: string[];
  scheduledAt?: Date | null;
  ipAddress?: string;
}) {
  const recipients = await resolveBroadcastRecipients(
    params.recipientFilter,
    params.recipientIds ?? []
  );
  if (recipients.length === 0) throw new Error("No recipients match this filter");

  const isScheduled = params.scheduledAt && params.scheduledAt.getTime() > Date.now();
  const broadcast = await prisma.emailBroadcast.create({
    data: {
      adminId: params.adminId,
      subject: params.subject,
      htmlBody: params.bodyHtml,
      recipientFilter: params.recipientFilter,
      recipientIds: params.recipientIds?.length ? params.recipientIds : undefined,
      status: isScheduled ? "SCHEDULED" : "PROCESSING",
      scheduledAt: isScheduled ? params.scheduledAt : null,
      totalRecipients: recipients.length,
      startedAt: isScheduled ? null : new Date(),
    },
  });

  for (const recipient of recipients) {
    const branded = buildBrandedEmail(recipient.name, params.subject, params.bodyHtml);
    await createEmailLog({
      to: recipient.email,
      recipientUserId: recipient.id,
      subject: branded.subject,
      htmlBody: branded.html,
      textBody: branded.text,
      sendType: "BROADCAST",
      sentById: params.adminId,
      broadcastId: broadcast.id,
      scheduledAt: isScheduled ? params.scheduledAt : null,
      status: isScheduled ? "SCHEDULED" : "PENDING",
    });
  }

  await logAdminAction(
    params.adminId,
    "EMAIL_BROADCAST_CREATED",
    {
      broadcastId: broadcast.id,
      recipientFilter: params.recipientFilter,
      totalRecipients: recipients.length,
      scheduled: Boolean(isScheduled),
      scheduledAt: params.scheduledAt?.toISOString(),
    },
    undefined,
    params.ipAddress
  );

  if (!isScheduled) {
    void processBroadcast(broadcast.id);
  }

  return { broadcastId: broadcast.id, totalRecipients: recipients.length };
}

async function processBroadcast(broadcastId: string) {
  const broadcast = await prisma.emailBroadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast || broadcast.status === "COMPLETED" || broadcast.status === "CANCELLED") return;

  await prisma.emailBroadcast.update({
    where: { id: broadcastId },
    data: { status: "PROCESSING", startedAt: broadcast.startedAt ?? new Date() },
  });

  let totalSent = 0;
  let totalFailed = 0;

  while (true) {
    const batch = await prisma.emailLog.findMany({
      where: {
        broadcastId,
        status: { in: ["PENDING", "SCHEDULED"] },
      },
      take: BROADCAST_BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) break;

    for (const log of batch) {
      const result = await deliverEmailLog(log.id);
      if (result.sent) totalSent += 1;
      else totalFailed += 1;
    }

    await delay(BROADCAST_BATCH_DELAY_MS);
  }

  const remaining = await prisma.emailLog.count({
    where: { broadcastId, status: { in: ["PENDING", "SCHEDULED"] } },
  });

  if (remaining > 0) return;

  await prisma.emailBroadcast.update({
    where: { id: broadcastId },
    data: {
      status: totalFailed > 0 && totalSent === 0 ? "FAILED" : "COMPLETED",
      sentCount: totalSent,
      failedCount: totalFailed,
      completedAt: new Date(),
    },
  });
}

export async function processScheduledEmails() {
  const now = new Date();

  const dueBroadcasts = await prisma.emailBroadcast.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  for (const broadcast of dueBroadcasts) {
    await prisma.emailLog.updateMany({
      where: { broadcastId: broadcast.id, status: "SCHEDULED" },
      data: { status: "PENDING" },
    });
    await prisma.emailBroadcast.update({
      where: { id: broadcast.id },
      data: { status: "PROCESSING", startedAt: now },
    });
    void processBroadcast(broadcast.id);
  }

  const dueIndividual = await prisma.emailLog.findMany({
    where: {
      sendType: "INDIVIDUAL",
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      broadcastId: null,
    },
    take: 20,
    select: { id: true },
  });

  for (const log of dueIndividual) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "PENDING" },
    });
    await deliverEmailLog(log.id);
  }

  return { broadcastsStarted: dueBroadcasts.length, individualsProcessed: dueIndividual.length };
}

export async function getEmailCenterOverview() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, today, sent, failed, pending, recent] = await Promise.all([
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.emailLog.count({ where: { status: "SENT" } }),
    prisma.emailLog.count({ where: { status: "FAILED" } }),
    prisma.emailLog.count({ where: { status: { in: ["PENDING", "SCHEDULED"] } } }),
    prisma.emailLog.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        sentBy: { select: { id: true, name: true, email: true } },
        recipientUser: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    stats: {
      totalEmails: total,
      emailsToday: today,
      successful: sent,
      failed,
      pending,
    },
    recentActivity: recent.map((log) => ({
      id: log.id,
      to: log.to,
      subject: log.subject,
      status: log.status,
      sendType: log.sendType,
      failureReason: log.failureReason,
      sentAt: log.sentAt?.toISOString() ?? null,
      createdAt: log.createdAt.toISOString(),
      sentBy: log.sentBy ? { id: log.sentBy.id, name: log.sentBy.name, email: log.sentBy.email } : null,
      recipient: log.recipientUser
        ? { id: log.recipientUser.id, name: log.recipientUser.name, email: log.recipientUser.email }
        : null,
    })),
  };
}

export type EmailBroadcastStatusType = EmailBroadcastStatus;
