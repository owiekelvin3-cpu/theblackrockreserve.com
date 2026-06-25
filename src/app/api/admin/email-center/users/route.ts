import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  phone: true,
  emailVerified: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim();
  const suggest = searchParams.get("suggest") === "1";
  const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? 20)));

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ users: [formatUser(user)] });
  }

  if (!q && suggest) {
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: userSelect,
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
      take: Math.min(limit, 12),
    });
    return NextResponse.json({ users: users.map(formatUser), suggested: true });
  }

  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    },
    select: userSelect,
    orderBy: [{ lastSeenAt: "desc" }, { name: "asc" }],
    take: limit,
  });

  return NextResponse.json({ users: users.map(formatUser) });
}

function formatUser(user: {
  id: string;
  name: string;
  email: string;
  status: string;
  phone: string | null;
  emailVerified: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    phone: user.phone,
    emailVerified: Boolean(user.emailVerified),
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
