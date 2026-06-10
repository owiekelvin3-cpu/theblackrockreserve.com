import type { Messages } from "@/lib/i18n/messages/en";
import en from "@/lib/i18n/messages/en";
import type { LocaleCode } from "@/lib/i18n/locales";
import { applyFlatTranslations } from "@/lib/i18n/flatten";
import { LOCALE_TRANSLATIONS } from "@/lib/i18n/translations/all";
import { LOCALE_SUPPLEMENT } from "@/lib/i18n/translations/supplement";

export function buildMessages(locale: LocaleCode): Messages {
  if (locale === "en") return en;
  const patch = {
    ...LOCALE_TRANSLATIONS[locale],
    ...LOCALE_SUPPLEMENT[locale],
  };
  if (!patch) return en;
  return applyFlatTranslations(en, patch);
}

export const allMessages: Record<LocaleCode, Messages> = Object.fromEntries(
  (["en", "fr", "es", "pt", "de", "it", "nl", "ru", "ar", "zh", "ja", "ko", "hi", "tr", "sw"] as LocaleCode[]).map(
    (code) => [code, buildMessages(code)]
  )
) as Record<LocaleCode, Messages>;
