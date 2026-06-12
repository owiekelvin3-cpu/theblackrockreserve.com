import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminUser } from "@/lib/admin-data";
import { registeredCustomerWhere } from "@/lib/customer-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { adminUserUpdateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const user = await getAdminUser(params.id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin user error:", error);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { id: params.id, ...registeredCustomerWhere },
    });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const dup = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (dup) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const { emailVerified: verifyFlag, ...profileFields } = parsed.data;
    const data: Parameters<typeof prisma.user.update>[0]["data"] = { ...profileFields };

    if (verifyFlag === true && !existing.emailVerified) {
      data.emailVerified = new Date();
      data.otpCode = null;
      data.otpExpires = null;
    } else if (verifyFlag === false) {
      data.emailVerified = null;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true, name: true, email: true, phone: true, accountType: true,
        kycStatus: true, status: true, emailVerified: true,
      },
    });

    if (verifyFlag === true && !existing.emailVerified) {
      await ensureUserBankAccounts(params.id);
    }

    await logAdminAction(
      session.user.id,
      "USER_UPDATE",
      { userId: params.id, changes: parsed.data },
      params.id,
      getClientIp(req)
    );

    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const existing = await prisma.user.findFirst({
      where: { id: params.id, ...registeredCustomerWhere },
    });
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.delete({ where: { id: params.id } });

    await logAdminAction(
      session.user.id,
      "USER_DELETE",
      { userId: params.id, email: existing.email, name: existing.name },
      params.id,
      getClientIp(req)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
