import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminMessages } from "@/lib/admin-data";
import { getAdminSupportConversations } from "@/lib/support-chat";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const [messages, conversations] = await Promise.all([
      getAdminMessages(),
      getAdminSupportConversations(),
    ]);
    return NextResponse.json({ messages, conversations });
  } catch (error) {
    console.error("Admin messages error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
