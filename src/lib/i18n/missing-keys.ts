/** Tracks missing translation keys (dev logging + optional telemetry). */
const logged = new Set<string>();

export function logMissingTranslationKey(key: string, locale: string) {
  const id = `${locale}:${key}`;
  if (logged.has(id)) return;
  logged.add(id);
  if (process.env.NODE_ENV === "development") {
    console.warn(`[i18n] Missing translation: "${key}" (locale: ${locale})`);
  }
}

export function resetMissingKeyLog() {
  logged.clear();
}
