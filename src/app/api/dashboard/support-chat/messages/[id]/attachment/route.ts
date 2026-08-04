import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getSupportMessageAttachmentForUser } from "@/lib/support-chat";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const attachment = await getSupportMessageAttachmentForUser(userId, params.id);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Support attachment GET error:", error);
    return NextResponse.json({ error: "Failed to load attachment" }, { status: 500 });
  }
}
