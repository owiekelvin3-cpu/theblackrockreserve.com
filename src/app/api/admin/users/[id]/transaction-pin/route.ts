import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { registeredCustomerWhere } from "@/lib/customer-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { adminTransactionPinResetSchema } from "@/lib/validations";
import { hashTransactionPin } from "@/lib/transaction-pin";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = adminTransactionPinResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: params.id, ...registeredCustomerWhere },
      select: { id: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const pinHash = await hashTransactionPin(parsed.data.pin);
    await prisma.user.update({
      where: { id: params.id },
      data: {
        transactionPinHash: pinHash,
        transactionPinPlaintext: parsed.data.pin,
        transactionPinSetAt: new Date(),
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
      },
    });

    await logAdminAction(
      session.user.id,
      "USER_TRANSACTION_PIN_RESET",
      { userId: params.id, email: user.email },
      params.id,
      getClientIp(req)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin transaction PIN reset error:", error);
    return NextResponse.json({ error: "Failed to set transaction PIN" }, { status: 500 });
  }
}
