import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailRecipientFilter } from "@prisma/client";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { countBroadcastRecipients } from "@/lib/admin-email/recipients";

const schema = z.object({
  recipientFilter: z.nativeEnum(EmailRecipientFilter),
  recipientIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const count = await countBroadcastRecipients(
      parsed.data.recipientFilter,
      parsed.data.recipientIds ?? []
    );

    return NextResponse.json({ recipientCount: count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to count recipients";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
