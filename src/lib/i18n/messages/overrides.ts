import type { Messages } from "@/lib/i18n/messages/en";
import en from "@/lib/i18n/messages/en";
import type { LocaleCode } from "@/lib/i18n/locales";

export { en as englishMessages };

export function buildMessages(locale: LocaleCode): Messages {
  if (locale === "en") return en;
  // Lazy-load translation tables so English pages avoid a large initial bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { buildLocaleMessages } = require("./build-locale-messages") as typeof import("./build-locale-messages");
  return buildLocaleMessages(locale as Exclude<LocaleCode, "en">);
}
