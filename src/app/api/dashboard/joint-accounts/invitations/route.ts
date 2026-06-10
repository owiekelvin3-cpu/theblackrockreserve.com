import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import {
  createJointInvitation,
  getUserJointInvitations,
  sendPlatformInvite,
} from "@/lib/joint-account-service";
import { checkRateLimit } from "@/lib/rate-limit";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  action: z.enum(["invite", "platform_invite"]).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const data = await getUserJointInvitations(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Joint invitations GET error:", error);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const rate = checkRateLimit(`joint-invite:${userId}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    if (parsed.data.action === "platform_invite") {
      await sendPlatformInvite({ inviterId: userId, email: parsed.data.email, name: parsed.data.name });
      return NextResponse.json({ success: true, platformInvite: true });
    }

    const result = await createJointInvitation({
      inviterId: userId,
      inviteeEmail: parsed.data.email,
      inviteeName: parsed.data.name,
      inviteePhone: parsed.data.phone,
      ipAddress: getClientIp(req),
    });

    if (!result.found) {
      return NextResponse.json({
        found: false,
        message: "This person does not have an account. Send them an invitation to join the platform first.",
        email: result.email,
      });
    }

    return NextResponse.json({ found: true, invitation: result.invitation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
