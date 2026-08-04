import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getSupportMessageAttachmentForAdmin } from "@/lib/support-chat";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const attachment = await getSupportMessageAttachmentForAdmin(params.id);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Admin support attachment GET error:", error);
    return NextResponse.json({ error: "Failed to load attachment" }, { status: 500 });
  }
}
