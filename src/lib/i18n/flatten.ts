import type { Messages } from "@/lib/i18n/messages/en";

/** Flatten nested message tree to dot-notation keys */
export function flattenMessages(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenMessages(value as Record<string, unknown>, path));
    }
  }
  return out;
}

/** Rebuild nested message tree from flat dot-notation keys */
export function unflattenMessages(flat: Record<string, string>): Messages {
  const root: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root as Messages;
}

export function applyFlatTranslations(
  base: Messages,
  translations: Record<string, string>
): Messages {
  const flat = flattenMessages(base as unknown as Record<string, unknown>);
  const merged = { ...flat, ...translations };
  return unflattenMessages(merged);
}

/** Verify locale has every key from English catalog */
export function missingTranslationKeys(
  enFlat: Record<string, string>,
  localeFlat: Record<string, string>
): string[] {
  return Object.keys(enFlat).filter((k) => !(k in localeFlat));
}
