import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminUsers } from "@/lib/admin-data";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") as "ACTIVE" | "SUSPENDED" | undefined;
  const kycStatus = req.nextUrl.searchParams.get("kycStatus") ?? undefined;

  try {
    const users = await getAdminUsers({ search, status, kycStatus });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
