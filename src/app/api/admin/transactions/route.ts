import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminTransactions } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const transactions = await getAdminTransactions();
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Admin transactions error:", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
