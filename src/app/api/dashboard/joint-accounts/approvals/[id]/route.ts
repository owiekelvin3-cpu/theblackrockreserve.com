import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { respondToApproval } from "@/lib/joint-account-service";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await respondToApproval({
      approvalId: params.id,
      userId,
      action: parsed.data.action,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process approval";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
