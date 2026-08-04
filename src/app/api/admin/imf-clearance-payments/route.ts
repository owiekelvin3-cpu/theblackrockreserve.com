import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { verifiedCustomerWhere } from "@/lib/customer-auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const payments = await prisma.imfClearancePayment.findMany({
      where: { user: verifiedCustomerWhere },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        withdrawalRequestId: true,
        amountUsd: true,
        status: true,
        txHash: true,
        proofNote: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        withdrawalRequest: { select: { id: true, amountUsd: true, method: true } },
      },
    });

    const proofIds = new Set(
      (
        await prisma.imfClearancePayment.findMany({
          where: { user: verifiedCustomerWhere, proofImage: { not: null } },
          select: { id: true },
        })
      ).map((p) => p.id)
    );

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user.name,
        userEmail: p.user.email,
        withdrawalRequestId: p.withdrawalRequestId,
        withdrawalAmount: Number(p.withdrawalRequest.amountUsd),
        amountUsd: Number(p.amountUsd),
        status: p.status,
        txHash: p.txHash,
        proofNote: p.proofNote,
        hasProofImage: proofIds.has(p.id),
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Admin IMF payments GET error:", error);
    return NextResponse.json({ error: "Failed to load IMF clearance payments" }, { status: 500 });
  }
}
