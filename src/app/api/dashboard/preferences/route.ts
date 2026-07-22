import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  isCurrencyAllowedForBadge,
} from "@/lib/currency";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notification-prefs";
import { ensureUserPrimaryAccountNumber } from "@/lib/bank-account-number";
import {
  getDbSchemaCapabilities,
  userVerificationBadgeSelect,
} from "@/lib/db-schema-capabilities";

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
  preferredCurrency: z
    .string()
    .refine((v) => (SUPPORTED_CURRENCIES as readonly string[]).includes(v))
    .optional(),
  name: z.string().min(2, "Name is required").max(120).optional(),
  phone: z.string().max(30).optional().nullable(),
  notificationPrefs: notificationPrefsSchema.optional(),
});

const BANK_ACCOUNT_CORE_SELECT = {
  id: true,
  name: true,
  type: true,
  currency: true,
} as const;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const caps = await getDbSchemaCapabilities();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferredLocale: true,
        preferredCurrency: true,
        profileImage: true,
        name: true,
        phone: true,
        notificationPrefs: true,
        createdAt: true,
        ...userVerificationBadgeSelect(caps),
      },
    });

    const accountNumber = caps.bankAccountNumbers
      ? await ensureUserPrimaryAccountNumber(userId)
      : null;

    const bankAccountsRaw = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: BANK_ACCOUNT_CORE_SELECT,
    });

    const bankAccounts = bankAccountsRaw.map((account) => ({ ...account, accountNumber: null }));

    const userWithBadge = user as typeof user & { verificationBadge?: string };
    const verificationBadge = userWithBadge?.verificationBadge ?? "NONE";
    const storedCurrency = user?.preferredCurrency ?? DEFAULT_CURRENCY;
    const preferredCurrency = isCurrencyAllowedForBadge(storedCurrency, verificationBadge)
      ? storedCurrency
      : DEFAULT_CURRENCY;

    return NextResponse.json({
      preferredLocale: user?.preferredLocale ?? "en",
      preferredCurrency,
      profileImage: user?.profileImage ?? null,
      name: user?.name ?? null,
      phone: user?.phone ?? null,
      notificationPrefs: parseNotificationPrefs(user?.notificationPrefs),
      verificationBadge: userWithBadge?.verificationBadge ?? "NONE",
      memberSince: user?.createdAt ?? null,
      accountNumber,
      bankAccounts,
    });
  } catch (error) {
    console.error("Preferences GET error:", error);
    return NextResponse.json(
      {
        preferredLocale: "en",
        preferredCurrency: "USD",
        profileImage: null,
        name: null,
        phone: null,
        notificationPrefs: parseNotificationPrefs(null),
        verificationBadge: "NONE",
        memberSince: null,
        accountNumber: null,
        bankAccounts: [],
      },
      { status: 200 }
    );
  }
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
      preferredCurrency?: string;
      name?: string;
      phone?: string | null;
      notificationPrefs?: NotificationPrefs;
    } = {};

    if (parsed.data.preferredLocale) data.preferredLocale = parsed.data.preferredLocale;
    if (parsed.data.preferredCurrency) {
      const caps = await getDbSchemaCapabilities();
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: userVerificationBadgeSelect(caps),
      });
      const badge = (existing as { verificationBadge?: string } | null)?.verificationBadge ?? "NONE";
      if (!isCurrencyAllowedForBadge(parsed.data.preferredCurrency, badge)) {
        return NextResponse.json(
          { error: "Nigerian Naira is available for Gold verified members only." },
          { status: 400 }
        );
      }
      data.preferredCurrency = parsed.data.preferredCurrency;
    }
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
        preferredCurrency: true,
        name: true,
        phone: true,
        notificationPrefs: true,
      },
    });

    return NextResponse.json({
      preferredLocale: user.preferredLocale,
      preferredCurrency: user.preferredCurrency,
      name: user.name,
      phone: user.phone,
      notificationPrefs: parseNotificationPrefs(user.notificationPrefs),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
