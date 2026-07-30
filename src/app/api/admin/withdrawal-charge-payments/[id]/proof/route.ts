import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminWithdrawalChargePaymentProofImage } from "@/lib/admin-data";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const proofImage = await getAdminWithdrawalChargePaymentProofImage(params.id);
    if (!proofImage) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }
    return NextResponse.json({ proofImage });
  } catch (error) {
    console.error("Withdrawal charge proof GET error:", error);
    return NextResponse.json({ error: "Failed to load proof" }, { status: 500 });
  }
}
