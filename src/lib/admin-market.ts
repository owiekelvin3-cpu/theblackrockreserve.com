import { prisma } from "@/lib/prisma";
import { ensureMarketAssetsSeeded } from "@/lib/market-assets";

export async function getAdminMarketAssets() {
  await ensureMarketAssetsSeeded();

  const assets = await prisma.marketAsset.findMany({
    orderBy: [{ enabled: "desc" }, { marketCapRank: "asc" }],
  });

  return assets.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    name: a.name,
    sector: a.sector,
    description: a.description,
    logoDomain: a.logoDomain,
    price: Number(a.price),
    changePercent: Number(a.changePercent),
    minInvestment: Number(a.minInvestment),
    riskRating: a.riskRating,
    expectedReturnPercent: Number(a.expectedReturnPercent),
    marketCapRank: a.marketCapRank,
    popularity: a.popularity,
    enabled: a.enabled,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

export async function getAdminInvestments(limit = 100) {
  const [orders, volume] = await Promise.all([
    prisma.investmentOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.investmentOrder.aggregate({
      _sum: { amountUsd: true, totalCost: true },
      _count: true,
    }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      userId: o.userId,
      userName: o.user.name,
      userEmail: o.user.email,
      symbol: o.symbol,
      assetName: o.assetName,
      amountUsd: Number(o.amountUsd),
      shares: Number(o.shares),
      priceAtPurchase: Number(o.priceAtPurchase),
      fee: Number(o.fee),
      totalCost: Number(o.totalCost),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    stats: {
      totalOrders: volume._count,
      totalVolume: Number(volume._sum.amountUsd ?? 0),
      totalCost: Number(volume._sum.totalCost ?? 0),
    },
  };
}
