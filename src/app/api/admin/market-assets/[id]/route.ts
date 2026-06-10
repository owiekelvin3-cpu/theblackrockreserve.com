import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  sector: z.string().min(1).max(60).optional(),
  description: z.string().min(1).max(2000).optional(),
  logoDomain: z.string().max(120).nullable().optional(),
  price: z.coerce.number().positive().optional(),
  changePercent: z.coerce.number().optional(),
  minInvestment: z.coerce.number().positive().optional(),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  expectedReturnPercent: z.coerce.number().optional(),
  marketCapRank: z.coerce.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.marketAsset.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const asset = await prisma.marketAsset.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await logAdminAction(
      session.user.id,
      parsed.data.enabled === false ? "MARKET_ASSET_DISABLE" : parsed.data.enabled === true ? "MARKET_ASSET_ENABLE" : "MARKET_ASSET_UPDATE",
      { symbol: asset.symbol, changes: parsed.data },
      undefined,
      getClientIp(req)
    );

    return NextResponse.json({ success: true, asset: { id: asset.id, symbol: asset.symbol, enabled: asset.enabled } });
  } catch (error) {
    console.error("Admin market asset PATCH error:", error);
    return NextResponse.json({ error: "Failed to update market asset" }, { status: 500 });
  }
}
