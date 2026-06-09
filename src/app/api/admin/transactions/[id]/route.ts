import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { updateAdminTransactionStatus } from "@/lib/admin-data";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const status = body.status as "COMPLETED" | "FAILED";
    if (status !== "COMPLETED" && status !== "FAILED") {
      return NextResponse.json({ error: "Status must be COMPLETED or FAILED" }, { status: 400 });
    }

    const updated = await updateAdminTransactionStatus(params.id, status);
    if (!updated) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    await logAdminAction(
      session.user.id,
      "TRANSACTION_STATUS_UPDATE",
      { transactionId: params.id, status },
      updated.userId,
      getClientIp(req)
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
