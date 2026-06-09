import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminWithdrawals } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const withdrawals = await getAdminWithdrawals();
    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error("Admin withdrawals GET error:", error);
    return NextResponse.json({ error: "Failed to load withdrawals" }, { status: 500 });
  }
}
