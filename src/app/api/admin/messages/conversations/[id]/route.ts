import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import {
  getAdminSupportConversation,
  sendAdminSupportReply,
} from "@/lib/support-chat";
import { validateSupportAttachment } from "@/lib/support-attachment";

const replySchema = z
  .object({
    content: z.string().max(4000).optional().default(""),
    attachment: z
      .object({
        name: z.string().min(1).max(180),
        mime: z.string().min(3).max(120),
        dataUrl: z.string().min(32).max(8_000_000),
      })
      .optional(),
  })
  .refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachment), {
    message: "Reply or attachment is required",
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

    let attachment = null;
    if (parsed.data.attachment) {
      const validated = validateSupportAttachment(parsed.data.attachment);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      attachment = validated.attachment;
    }

    const conversation = await sendAdminSupportReply(
      params.id,
      session.user.id,
      parsed.data.content?.trim() ?? "",
      attachment
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Reply saved but conversation could not be reloaded" },
        { status: 500 }
      );
    }

    if (conversation.user) {
      try {
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
          category: "security",
        });
      } catch (notifyError) {
        console.error("Support reply notification failed:", notifyError);
      }
    }

    try {
      await logAdminAction(
        session.user.id,
        "REPLY_SUPPORT_CHAT",
        { conversationId: params.id, hasAttachment: Boolean(attachment) },
        conversation.user?.id,
        getClientIp(req)
      );
    } catch (auditError) {
      console.error("Support reply audit log failed:", auditError);
    }

    invalidateAdminCaches();

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Admin conversation reply error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
