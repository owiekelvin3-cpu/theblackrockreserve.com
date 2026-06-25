import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { ensureDefaultEmailTemplates } from "@/lib/admin-email/service";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  subject: z.string().min(1).max(200),
  htmlBody: z.string().min(1).max(50000),
  textBody: z.string().optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  await ensureDefaultEmailTemplates(session.user.id);

  const templates = await prisma.emailTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      subject: true,
      htmlBody: true,
      textBody: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ templates });
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

    const existing = await prisma.emailTemplate.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) {
      return NextResponse.json({ error: "A template with this slug already exists" }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        subject: parsed.data.subject,
        htmlBody: parsed.data.htmlBody,
        textBody: parsed.data.textBody,
        isDefault: false,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
