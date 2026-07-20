import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminProfitTaxPayments } from "@/lib/admin-data";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const payments = await getAdminProfitTaxPayments();
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Admin profit tax payments GET error:", error);
    return NextResponse.json({ error: "Failed to load profit tax payments" }, { status: 500 });
  }
}
