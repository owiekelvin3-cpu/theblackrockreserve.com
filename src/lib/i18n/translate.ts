import type { Messages } from "@/lib/i18n/messages/en";
import { logMissingTranslationKey } from "@/lib/i18n/missing-keys";
import { formatMessage, resolveMessage } from "@/lib/i18n/utils";
import type { LocaleCode } from "@/lib/i18n/locales";

export function createTranslator(
  locale: LocaleCode,
  messages: Messages,
  english: Messages
) {
  return (key: string, vars?: Record<string, string | number>): string => {
    const localized = resolveMessage(messages, key);
    if (localized) return formatMessage(localized, vars);

    const fallback = resolveMessage(english, key);
    if (fallback) {
      if (locale !== "en") logMissingTranslationKey(key, locale);
      return formatMessage(fallback, vars);
    }

    if (locale !== "en") logMissingTranslationKey(key, locale);
    return key;
  };
}
