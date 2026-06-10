import type { NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseLocaleCode,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { createServerTranslator } from "@/lib/i18n/server";

/** Resolve locale from cookie, Accept-Language, or explicit override. */
export function getLocaleFromRequest(
  req: NextRequest,
  override?: LocaleCode | string | null
): LocaleCode {
  const explicit = parseLocaleCode(override ?? null);
  if (explicit) return explicit;

  const cookie = parseLocaleCode(req.cookies.get(LOCALE_COOKIE)?.value);
  if (cookie) return cookie;

  const accept = req.headers.get("accept-language");
  if (accept) {
    const primary = accept.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
    const parsed = parseLocaleCode(primary);
    if (parsed) return parsed;
  }

  return DEFAULT_LOCALE;
}

export function getApiTranslator(locale: LocaleCode) {
  return createServerTranslator(locale);
}

/** Map common API error strings to translation keys. */
const API_ERROR_KEYS: Record<string, string> = {
  Unauthorized: "apiErrors.unauthorized",
  Forbidden: "apiErrors.forbidden",
  "Invalid input": "apiErrors.invalidInput",
  "Failed to load dashboard": "apiErrors.loadFailed",
  "Email already registered": "apiErrors.emailRegistered",
  "Invalid verification code": "apiErrors.invalidCode",
  "Invalid or expired code": "apiErrors.invalidCode",
  "User not found": "apiErrors.userNotFound",
  "Invalid credentials": "apiErrors.invalidCredentials",
  "Account suspended": "apiErrors.accountSuspended",
  "Insufficient wallet balance": "apiErrors.insufficientBalance",
  "Invalid account": "apiErrors.invalidAccount",
  "Investment failed": "apiErrors.investmentFailed",
  "Failed": "apiErrors.genericFailed",
  "Submission failed": "apiErrors.submissionFailed",
  "Application failed": "apiErrors.applicationFailed",
};

export function translateApiErrorMessage(
  message: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const key = API_ERROR_KEYS[message];
  return key ? t(key) : message;
}

export function localizedApiError(
  locale: LocaleCode,
  messageOrKey: string,
  vars?: Record<string, string | number>
) {
  const { t } = createServerTranslator(locale);
  const key = API_ERROR_KEYS[messageOrKey];
  return key ? t(key, vars) : t(messageOrKey, vars) !== messageOrKey ? t(messageOrKey, vars) : messageOrKey;
}
