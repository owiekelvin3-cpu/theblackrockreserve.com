import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import {
  deleteAdminMessage,
  getAdminContactMessage,
  replyToContactMessage,
} from "@/lib/admin-data";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { invalidateAdminCaches } from "@/lib/admin-cache";

const replySchema = z.object({
  content: z.string().min(1, "Reply is required").max(4000),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const message = await getAdminContactMessage(params.id);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Get contact message error:", error);
    return NextResponse.json({ error: "Failed to load message" }, { status: 500 });
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

    const result = await replyToContactMessage({
      messageId: params.id,
      adminId: session.user.id,
      content: parsed.data.content,
    });

    try {
      await logAdminAction(
        session.user.id,
        "REPLY_CONTACT_MESSAGE",
        {
          messageId: params.id,
          recipientEmail: result.contact?.email,
        },
        undefined,
        getClientIp(req)
      );
    } catch (auditError) {
      console.error("Contact reply audit log failed:", auditError);
    }

    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      message: result.contact,
      reply: result.reply,
    });
  } catch (error) {
    console.error("Contact reply error:", error);
    const msg = error instanceof Error ? error.message : "Failed to send reply";
    const status =
      msg.includes("not found") ? 404 : msg.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    await deleteAdminMessage(params.id);
    await logAdminAction(
      session.user.id,
      "DELETE_MESSAGE",
      { messageId: params.id },
      undefined,
      getClientIp(_req)
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
