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
import { validateSupportAttachment } from "@/lib/support-attachment";

const sendSchema = z
  .object({
    content: z.string().max(2000).optional().default(""),
    attachment: z
      .object({
        name: z.string().min(1).max(180),
        mime: z.string().min(3).max(120),
        dataUrl: z.string().min(32).max(8_000_000),
      })
      .optional(),
  })
  .refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachment), {
    message: "Message or attachment is required",
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

    let attachment = null;
    if (parsed.data.attachment) {
      const validated = validateSupportAttachment(parsed.data.attachment);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      attachment = validated.attachment;
    }

    const content = parsed.data.content?.trim() ?? "";
    const conversation = await sendUserSupportMessage(userId, content, attachment);
    await recordUserContactedSupport(
      userId,
      content || (attachment ? `Attachment: ${attachment.name}` : undefined)
    );
    invalidateAdminCaches();
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Support chat POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
