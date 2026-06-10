import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminMarketAssets } from "@/lib/admin-market";
import { prisma } from "@/lib/prisma";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";

const createSchema = z.object({
  symbol: z.string().min(1).max(12),
  name: z.string().min(1).max(120),
  sector: z.string().min(1).max(60),
  description: z.string().min(1).max(2000),
  logoDomain: z.string().max(120).optional(),
  price: z.coerce.number().positive(),
  changePercent: z.coerce.number().optional(),
  minInvestment: z.coerce.number().positive().optional(),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  expectedReturnPercent: z.coerce.number().optional(),
  marketCapRank: z.coerce.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const assets = await getAdminMarketAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Admin market assets GET error:", error);
    return NextResponse.json({ error: "Failed to load market assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const symbol = parsed.data.symbol.toUpperCase();
    const existing = await prisma.marketAsset.findUnique({ where: { symbol } });
    if (existing) {
      return NextResponse.json({ error: "Symbol already exists" }, { status: 409 });
    }

    const asset = await prisma.marketAsset.create({
      data: {
        symbol,
        name: parsed.data.name,
        sector: parsed.data.sector,
        description: parsed.data.description,
        logoDomain: parsed.data.logoDomain ?? null,
        price: parsed.data.price,
        changePercent: parsed.data.changePercent ?? 0,
        minInvestment: parsed.data.minInvestment ?? 100,
        riskRating: parsed.data.riskRating ?? "Medium",
        expectedReturnPercent: parsed.data.expectedReturnPercent ?? 8,
        marketCapRank: parsed.data.marketCapRank ?? 999,
        enabled: parsed.data.enabled ?? true,
      },
    });

    await logAdminAction(
      session.user.id,
      "MARKET_ASSET_CREATE",
      { symbol, name: parsed.data.name },
      undefined,
      getClientIp(req)
    );

    return NextResponse.json({ asset: { id: asset.id, symbol: asset.symbol } }, { status: 201 });
  } catch (error) {
    console.error("Admin market assets POST error:", error);
    return NextResponse.json({ error: "Failed to create market asset" }, { status: 500 });
  }
}
