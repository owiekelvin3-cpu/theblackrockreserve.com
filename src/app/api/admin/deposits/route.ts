import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminDeposits } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const deposits = await getAdminDeposits();
    return NextResponse.json({ deposits });
  } catch (error) {
    console.error("Admin deposits error:", error);
    return NextResponse.json({ error: "Failed to load deposits" }, { status: 500 });
  }
}
