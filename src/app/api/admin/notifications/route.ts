import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminNotificationCounts } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const counts = await getAdminNotificationCounts();
    return NextResponse.json(counts);
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json({ error: "Failed to load notification counts" }, { status: 500 });
  }
}
