import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getLocaleDefinition,
  parseLocaleCode,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { buildMessages, allMessages } from "@/lib/i18n/messages/overrides";
import { createTranslator } from "@/lib/i18n/translate";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Read persisted locale: cookie → authenticated user DB preference → default. */
export async function getServerLocale(): Promise<LocaleCode> {
  const cookieStore = await cookies();
  const fromCookie = parseLocaleCode(cookieStore.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLocale: true },
      });
      const fromDb = parseLocaleCode(user?.preferredLocale ?? null);
      if (fromDb) return fromDb;
    }
  } catch {
    /* session/db unavailable */
  }

  return DEFAULT_LOCALE;
}

export async function getUserLocale(userId: string): Promise<LocaleCode> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    return parseLocaleCode(user?.preferredLocale ?? null) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getLocaleDir(code: LocaleCode): "ltr" | "rtl" {
  return getLocaleDefinition(code).dir;
}

export function createServerTranslator(locale: LocaleCode) {
  const messages = buildMessages(locale);
  const english = allMessages.en;

  return {
    locale,
    messages,
    dir: getLocaleDir(locale),
    t: createTranslator(locale, messages, english),
  };
}
