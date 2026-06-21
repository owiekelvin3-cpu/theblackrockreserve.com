import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import {
  getUserSupportConversation,
  markSupportRepliesRead,
  sendUserSupportMessage,
} from "@/lib/support-chat";
import { recordUserContactedSupport } from "@/lib/account-freeze";

const sendSchema = z.object({
  content: z.string().min(1, "Message is required").max(2000),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const conversation = await getUserSupportConversation(userId);
    if (conversation?.userHasUnreadReply) {
      await markSupportRepliesRead(userId);
    }
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Support chat GET error:", error);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid message" },
        { status: 400 }
      );
    }

    const conversation = await sendUserSupportMessage(userId, parsed.data.content);
    await recordUserContactedSupport(userId, parsed.data.content);
    invalidateAdminCaches();
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Support chat POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
