import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { sendIndividualAdminEmail } from "@/lib/admin-email/service";

const schema = z.object({
  userId: z.string().min(1),
  subject: z.string().min(1).max(200),
  bodyHtml: z.string().min(1).max(50000),
  templateId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const result = await sendIndividualAdminEmail({
      adminId: session.user.id,
      userId: parsed.data.userId,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      templateId: parsed.data.templateId,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
