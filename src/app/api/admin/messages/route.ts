import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminMessages } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const messages = await getAdminMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Admin messages error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
