import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import {
  getAdminSupportConversation,
  sendAdminSupportReply,
} from "@/lib/support-chat";

const replySchema = z.object({
  content: z.string().min(1, "Reply is required").max(4000),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const conversation = await getAdminSupportConversation(params.id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Admin conversation GET error:", error);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid reply" },
        { status: 400 }
      );
    }

    const conversation = await sendAdminSupportReply(
      params.id,
      session.user.id,
      parsed.data.content
    );

    if (conversation?.user) {
      const title = "Support team replied";
      const message =
        "A client services specialist has responded to your support request. Open Support Chat in your dashboard to continue the conversation.";
      await createUserNotification({
        userId: conversation.user.id,
        type: "SUPPORT_REPLY",
        title,
        message,
      });
      void sendUserNotificationEmail({
        userId: conversation.user.id,
        title,
        message,
      });
    }

    await logAdminAction(
      session.user.id,
      "REPLY_SUPPORT_CHAT",
      { conversationId: params.id },
      conversation?.user?.id,
      getClientIp(req)
    );

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Admin conversation reply error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
