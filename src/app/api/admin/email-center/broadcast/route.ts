import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailRecipientFilter } from "@prisma/client";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { createBroadcast } from "@/lib/admin-email/service";
import { countBroadcastRecipients } from "@/lib/admin-email/recipients";

const filterEnum = z.nativeEnum(EmailRecipientFilter);

const previewSchema = z.object({
  action: z.literal("preview"),
  recipientFilter: filterEnum,
  recipientIds: z.array(z.string()).optional(),
});

const sendSchema = z.object({
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1).max(50000),
  recipientFilter: filterEnum,
  recipientIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  saveDraft: z.boolean().optional(),
  draftName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();

    const preview = previewSchema.safeParse(body);
    if (preview.success) {
      const count = await countBroadcastRecipients(
        preview.data.recipientFilter,
        preview.data.recipientIds ?? []
      );
      return NextResponse.json({ recipientCount: count });
    }

    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;

    const result = await createBroadcast({
      adminId: session.user.id,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      recipientFilter: parsed.data.recipientFilter,
      recipientIds: parsed.data.recipientIds,
      scheduledAt,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      ok: true,
      ...result,
      scheduled: Boolean(scheduledAt && scheduledAt.getTime() > Date.now()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create broadcast";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
