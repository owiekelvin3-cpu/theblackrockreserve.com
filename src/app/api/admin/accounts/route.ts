import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminAccounts } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const accounts = await getAdminAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Admin accounts error:", error);
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
  }
}
