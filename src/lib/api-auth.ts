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

/** Admin APIs — always re-check role/status in DB so demoted/suspended admins lose access. */
export async function getAdminSession() {
  let candidateId: string | null = null;
  let candidateEmail = "";
  let candidateName = "Admin";

  const session = await getServerSession(authOptions);
  if (session?.user?.id && session.user.role === "ADMIN") {
    candidateId = session.user.id;
    candidateEmail = session.user.email ?? "";
    candidateName = session.user.name ?? "Admin";
  } else {
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
      candidateId = token.sub;
      candidateEmail = (token.email as string) ?? "";
      candidateName = (token.name as string) ?? "Admin";
    }
  }

  if (!candidateId) return null;

  const admin = await prisma.user.findFirst({
    where: {
      id: candidateId,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: { id: true, email: true, name: true },
  });

  if (!admin) return null;

  return {
    user: {
      id: admin.id,
      email: admin.email || candidateEmail,
      name: admin.name || candidateName,
      role: "ADMIN" as const,
    },
  };
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
