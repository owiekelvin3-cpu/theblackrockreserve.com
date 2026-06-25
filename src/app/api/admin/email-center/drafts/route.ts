import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailRecipientFilter } from "@prisma/client";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(120).default("Untitled draft"),
  subject: z.string().default(""),
  htmlBody: z.string().default(""),
  recipientFilter: z.nativeEnum(EmailRecipientFilter).optional().nullable(),
  recipientIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  isBroadcast: z.boolean().default(false),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const drafts = await prisma.emailDraft.findMany({
    where: { adminId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const draft = await prisma.emailDraft.create({
      data: {
        adminId: session.user.id,
        name: parsed.data.name,
        subject: parsed.data.subject,
        htmlBody: parsed.data.htmlBody,
        recipientFilter: parsed.data.recipientFilter ?? null,
        recipientIds: parsed.data.recipientIds?.length ? parsed.data.recipientIds : undefined,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        isBroadcast: parsed.data.isBroadcast,
      },
    });

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save draft";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
