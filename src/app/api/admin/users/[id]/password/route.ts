import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { registeredCustomerWhere } from "@/lib/customer-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { adminPasswordResetSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = adminPasswordResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: params.id, ...registeredCustomerWhere },
      select: { id: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({
      where: { id: params.id },
      data: { password: passwordHash, passwordPlaintext: parsed.data.password },
    });

    await logAdminAction(
      session.user.id,
      "USER_PASSWORD_RESET",
      { userId: params.id, email: user.email },
      params.id,
      getClientIp(req)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin password reset error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
