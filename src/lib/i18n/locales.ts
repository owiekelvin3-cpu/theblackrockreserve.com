export type LocaleCode =
  | "en"
  | "fr"
  | "es"
  | "pt"
  | "de"
  | "it"
  | "nl"
  | "ru"
  | "ar"
  | "zh"
  | "ja"
  | "ko"
  | "hi"
  | "tr"
  | "sw";

export type LocaleDefinition = {
  code: LocaleCode;
  /** BCP 47 tag for Intl formatters */
  bcp47: string;
  nativeName: string;
  englishName: string;
  flag: string;
  dir: "ltr" | "rtl";
};

export const LOCALES: LocaleDefinition[] = [
  { code: "en", bcp47: "en-US", nativeName: "English", englishName: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "fr", bcp47: "fr-FR", nativeName: "Français", englishName: "French", flag: "🇫🇷", dir: "ltr" },
  { code: "es", bcp47: "es-ES", nativeName: "Español", englishName: "Spanish", flag: "🇪🇸", dir: "ltr" },
  { code: "pt", bcp47: "pt-BR", nativeName: "Português", englishName: "Portuguese", flag: "🇧🇷", dir: "ltr" },
  { code: "de", bcp47: "de-DE", nativeName: "Deutsch", englishName: "German", flag: "🇩🇪", dir: "ltr" },
  { code: "it", bcp47: "it-IT", nativeName: "Italiano", englishName: "Italian", flag: "🇮🇹", dir: "ltr" },
  { code: "nl", bcp47: "nl-NL", nativeName: "Nederlands", englishName: "Dutch", flag: "🇳🇱", dir: "ltr" },
  { code: "ru", bcp47: "ru-RU", nativeName: "Русский", englishName: "Russian", flag: "🇷🇺", dir: "ltr" },
  { code: "ar", bcp47: "ar-SA", nativeName: "العربية", englishName: "Arabic", flag: "🇸🇦", dir: "rtl" },
  { code: "zh", bcp47: "zh-CN", nativeName: "中文", englishName: "Chinese", flag: "🇨🇳", dir: "ltr" },
  { code: "ja", bcp47: "ja-JP", nativeName: "日本語", englishName: "Japanese", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", bcp47: "ko-KR", nativeName: "한국어", englishName: "Korean", flag: "🇰🇷", dir: "ltr" },
  { code: "hi", bcp47: "hi-IN", nativeName: "हिन्दी", englishName: "Hindi", flag: "🇮🇳", dir: "ltr" },
  { code: "tr", bcp47: "tr-TR", nativeName: "Türkçe", englishName: "Turkish", flag: "🇹🇷", dir: "ltr" },
  { code: "sw", bcp47: "sw-KE", nativeName: "Kiswahili", englishName: "Swahili", flag: "🇰🇪", dir: "ltr" },
];

export const DEFAULT_LOCALE: LocaleCode = "en";
export const LOCALE_STORAGE_KEY = "br-locale";
export const LOCALE_COOKIE = "br-locale";

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function getLocaleDefinition(code: string): LocaleDefinition {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

/** Map browser language to supported locale */
export function detectBrowserLocale(): LocaleCode {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of langs) {
    const base = raw.split("-")[0]?.toLowerCase();
    const match = LOCALES.find((l) => l.code === base);
    if (match) return match.code;
  }
  return DEFAULT_LOCALE;
}
