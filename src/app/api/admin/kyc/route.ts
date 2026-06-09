import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminKycQueue } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const queue = await getAdminKycQueue();
    return NextResponse.json({ queue });
  } catch (error) {
    console.error("Admin KYC error:", error);
    return NextResponse.json({ error: "Failed to load KYC queue" }, { status: 500 });
  }
}
