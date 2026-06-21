import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getAccountFreezeStatus } from "@/lib/account-freeze";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const status = await getAccountFreezeStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Account freeze status error:", error);
    return NextResponse.json({ error: "Failed to load account status" }, { status: 500 });
  }
}
