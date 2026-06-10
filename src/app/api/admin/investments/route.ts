import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminInvestments } from "@/lib/admin-market";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const data = await getAdminInvestments();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin investments GET error:", error);
    return NextResponse.json({ error: "Failed to load investments" }, { status: 500 });
  }
}
