import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { getAdminProfitTaxes } from "@/lib/admin-data";
import { userProfitTaxSchema } from "@/lib/validations";
import { buildProfitTaxUpsertData } from "@/lib/profit-tax";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import { verifiedCustomerWhere } from "@/lib/customer-auth";
import { updatePlatformSettings, SETTING_KEYS } from "@/lib/platform-settings";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const data = await getAdminProfitTaxes();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin profit taxes GET error:", error);
    return NextResponse.json({ error: "Failed to load profit taxes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = userProfitTaxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const taxData = buildProfitTaxUpsertData(parsed.data.percentage, session.user.id);

    if (parsed.data.applyToAll) {
      const users = await prisma.user.findMany({
        where: { ...verifiedCustomerWhere, role: "USER" },
        select: { id: true, name: true, email: true },
      });

      if (users.length === 0) {
        return NextResponse.json({ error: "No users found" }, { status: 404 });
      }

      await prisma.$transaction(
        users.map((user) =>
          prisma.userProfitTax.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ...taxData },
            update: taxData,
          })
        )
      );

      await updatePlatformSettings(
        {
          [SETTING_KEYS.PROFIT_TAX_ENABLED]: "true",
          [SETTING_KEYS.PROFIT_TAX_PERCENTAGE]: String(parsed.data.percentage),
        },
        session.user.id
      );

      await logAdminAction(
        session.user.id,
        "PROFIT_TAX_SET_ALL",
        { percentage: parsed.data.percentage, userCount: users.length },
        undefined,
        getClientIp(req)
      );

      invalidateAdminCaches();

      return NextResponse.json({
        appliedCount: users.length,
        message: `Profit tax set to ${parsed.data.percentage}% for all ${users.length} users`,
      });
    }

    const user = await prisma.user.findFirst({
      where: { id: parsed.data.userId, role: "USER" },
      select: { id: true, name: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const tax = await prisma.userProfitTax.upsert({
      where: { userId: parsed.data.userId! },
      create: {
        userId: parsed.data.userId!,
        ...taxData,
      },
      update: taxData,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    await logAdminAction(
      session.user.id,
      "PROFIT_TAX_SET",
      {
        userId: user.id,
        userEmail: user.email,
        percentage: parsed.data.percentage,
      },
      user.id,
      getClientIp(req)
    );

    invalidateAdminCaches();

    return NextResponse.json({
      tax: {
        id: tax.id,
        userId: tax.userId,
        userName: tax.user.name,
        userEmail: tax.user.email,
        percentage: Number(tax.percentage),
        active: tax.active,
      },
      message: `Profit tax set to ${parsed.data.percentage}% for ${user.name}`,
    });
  } catch (error) {
    console.error("Admin profit taxes POST error:", error);
    return NextResponse.json({ error: "Failed to save profit tax" }, { status: 500 });
  }
}
