import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import {
  ensureDefaultEmailTemplates,
  getEmailCenterOverview,
  processScheduledEmails,
} from "@/lib/admin-email/service";
import { isEmailConfigured } from "@/lib/email";

function emailCenterErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Email Center database tables are missing. Run npm run db:migrate against this environment.";
    }
  }
  const text = error instanceof Error ? error.message : "";
  if (/EmailLog|EmailTemplate|EmailDraft|EmailBroadcast/i.test(text)) {
    return "Email Center database tables are missing. Run npm run db:migrate against this environment.";
  }
  return error instanceof Error ? error.message : "Failed to load Email Center";
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    await ensureDefaultEmailTemplates(session.user.id);
    void processScheduledEmails();

    const overview = await getEmailCenterOverview();

    return NextResponse.json({
      ...overview,
      smtpConfigured: isEmailConfigured(),
      permissions: {
        canSendIndividual: true,
        canSendBroadcast: true,
      },
      admin: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    });
  } catch (error) {
    console.error("Email center overview error:", error);
    return NextResponse.json({ error: emailCenterErrorMessage(error) }, { status: 500 });
  }
}
