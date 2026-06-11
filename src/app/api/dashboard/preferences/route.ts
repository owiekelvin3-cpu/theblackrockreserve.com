import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notification-prefs";

const notificationPrefsSchema = z.object({
  transactions: z.boolean(),
  investments: z.boolean(),
  security: z.boolean(),
  marketing: z.boolean(),
});

const patchSchema = z.object({
  preferredLocale: z
    .string()
    .refine((v) => (LOCALE_CODES as readonly string[]).includes(v))
    .optional(),
  name: z.string().min(2, "Name is required").max(120).optional(),
  phone: z.string().max(30).optional().nullable(),
  notificationPrefs: notificationPrefsSchema.optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferredLocale: true,
      profileImage: true,
      name: true,
      phone: true,
      notificationPrefs: true,
    },
  });

  return NextResponse.json({
    preferredLocale: user?.preferredLocale ?? "en",
    profileImage: user?.profileImage ?? null,
    name: user?.name ?? null,
    phone: user?.phone ?? null,
    notificationPrefs: parseNotificationPrefs(user?.notificationPrefs),
  });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }

    const data: {
      preferredLocale?: string;
      name?: string;
      phone?: string | null;
      notificationPrefs?: NotificationPrefs;
    } = {};

    if (parsed.data.preferredLocale) data.preferredLocale = parsed.data.preferredLocale;
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.phone !== undefined) {
      const trimmed = parsed.data.phone?.trim();
      data.phone = trimmed ? trimmed : null;
    }
    if (parsed.data.notificationPrefs) data.notificationPrefs = parsed.data.notificationPrefs;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        preferredLocale: true,
        name: true,
        phone: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json({
      preferredLocale: user.preferredLocale,
      name: user.name,
      phone: user.phone,
      notificationPrefs: parseNotificationPrefs(user.notificationPrefs),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
