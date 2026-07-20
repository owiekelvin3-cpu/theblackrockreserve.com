import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const { userId } = await params;
    const existing = await prisma.userProfitTax.findUnique({ where: { userId } });
    if (!existing) return NextResponse.json({ error: "Tax not found" }, { status: 404 });

    await prisma.userProfitTax.delete({ where: { userId } });

    await logAdminAction(
      session.user.id,
      "PROFIT_TAX_REMOVED",
      { userId },
      userId,
      getClientIp(req)
    );

    invalidateAdminCaches();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin profit tax DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove tax" }, { status: 500 });
  }
}
