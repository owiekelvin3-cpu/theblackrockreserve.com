/** Missing translation keys — populated by scripts/generate-i18n-supplement.mjs */
import type { LocaleCode } from "@/lib/i18n/locales";

export const LOCALE_SUPPLEMENT: Partial<Record<Exclude<LocaleCode, "en">, Record<string, string>>> = {};
