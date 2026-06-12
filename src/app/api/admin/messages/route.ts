import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminMessages } from "@/lib/admin-data";
import { getAdminSupportConversations } from "@/lib/support-chat";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const [messagesResult, conversationsResult] = await Promise.allSettled([
      getAdminMessages(),
      getAdminSupportConversations(),
    ]);

    if (messagesResult.status === "rejected") {
      console.error("Admin contact messages error:", messagesResult.reason);
    }
    if (conversationsResult.status === "rejected") {
      console.error("Admin support conversations error:", conversationsResult.reason);
    }

    if (messagesResult.status === "rejected" && conversationsResult.status === "rejected") {
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
    }

    return NextResponse.json({
      messages: messagesResult.status === "fulfilled" ? messagesResult.value : [],
      conversations: conversationsResult.status === "fulfilled" ? conversationsResult.value : [],
      partialError:
        messagesResult.status === "rejected" || conversationsResult.status === "rejected"
          ? "Some message data could not be loaded. Try refreshing."
          : undefined,
    });
  } catch (error) {
    console.error("Admin messages error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
