import type { Messages } from "@/lib/i18n/messages/en";
import en from "@/lib/i18n/messages/en";
import type { LocaleCode } from "@/lib/i18n/locales";
import { applyFlatTranslations } from "@/lib/i18n/flatten";
import { LOCALE_TRANSLATIONS } from "@/lib/i18n/translations/all";
import { LOCALE_SUPPLEMENT } from "@/lib/i18n/translations/supplement";

type NonEnglishLocale = Exclude<LocaleCode, "en">;

export function buildLocaleMessages(locale: NonEnglishLocale): Messages {
  const patch = {
    ...LOCALE_TRANSLATIONS[locale],
    ...LOCALE_SUPPLEMENT[locale],
  };
  if (!patch || Object.keys(patch).length === 0) return en;
  return applyFlatTranslations(en, patch);
}
