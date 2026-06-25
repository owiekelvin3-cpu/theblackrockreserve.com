import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { isSuperAdmin } from "@/lib/admin-email/super-admin";
import {
  ensureDefaultEmailTemplates,
  getEmailCenterOverview,
  processScheduledEmails,
} from "@/lib/admin-email/service";
import { isEmailConfigured } from "@/lib/email";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  await ensureDefaultEmailTemplates(session.user.id);
  void processScheduledEmails();

  const overview = await getEmailCenterOverview();

  return NextResponse.json({
    ...overview,
    smtpConfigured: isEmailConfigured(),
    permissions: {
      canSendIndividual: true,
      canSendBroadcast: isSuperAdmin(session.user.email),
      isSuperAdmin: isSuperAdmin(session.user.email),
    },
    admin: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  });
}
