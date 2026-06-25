import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailRecipientFilter } from "@prisma/client";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  subject: z.string().optional(),
  htmlBody: z.string().optional(),
  recipientFilter: z.nativeEnum(EmailRecipientFilter).optional().nullable(),
  recipientIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  isBroadcast: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: params.id, adminId: session.user.id },
    });
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const updated = await prisma.emailDraft.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        scheduledAt:
          parsed.data.scheduledAt === undefined
            ? undefined
            : parsed.data.scheduledAt
              ? new Date(parsed.data.scheduledAt)
              : null,
        recipientIds: parsed.data.recipientIds,
      },
    });

    return NextResponse.json({ draft: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update draft";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const draft = await prisma.emailDraft.findFirst({
    where: { id: params.id, adminId: session.user.id },
  });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  await prisma.emailDraft.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
