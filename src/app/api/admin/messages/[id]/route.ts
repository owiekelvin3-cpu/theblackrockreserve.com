import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { deleteAdminMessage } from "@/lib/admin-data";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";

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
