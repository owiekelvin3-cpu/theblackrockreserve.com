import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validateProfileImageDataUrl } from "@/lib/profile-image";

const postSchema = z.object({
  image: z.string().min(100),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileImage: true },
  });

  return NextResponse.json({ image: user?.profileImage ?? null });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid image payload" }, { status: 400 });
    }

    const check = validateProfileImageDataUrl(parsed.data.image);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: parsed.data.image },
    });

    return NextResponse.json({ ok: true, image: parsed.data.image });
  } catch {
    return NextResponse.json({ error: "Failed to save profile image" }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove image" }, { status: 500 });
  }
}
