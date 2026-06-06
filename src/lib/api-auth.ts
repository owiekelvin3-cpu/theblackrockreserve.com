import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifiedCustomerWhere } from "@/lib/customer-auth";

/** Verified customer (USER role) — for all dashboard APIs */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") return null;

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      ...verifiedCustomerWhere,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.role === "ADMIN") {
    return session;
  }

  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const token = await getToken({
    req: { headers: { cookie: cookieHeader } } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token?.role === "ADMIN" && token.sub) {
    return {
      user: {
        id: token.sub,
        email: (token.email as string) ?? "",
        name: (token.name as string) ?? "Admin",
        role: "ADMIN" as const,
      },
    };
  }

  return null;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
