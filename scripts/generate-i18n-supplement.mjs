/**
 * Generates src/lib/i18n/translations/supplement.ts with translations for keys
 * missing from LOCALE_TRANSLATIONS in all.ts.
 *
 * Run: node scripts/generate-i18n-supplement.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { translate } from "@vitalets/google-translate-api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function toImportUrl(relativePath) {
  return pathToFileURL(path.join(ROOT, relativePath)).href;
}

const LOCALE_BCP47 = {
  fr: "fr",
  es: "es",
  pt: "pt",
  de: "de",
  it: "it",
  nl: "nl",
  ru: "ru",
  ar: "ar",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
  hi: "hi",
  tr: "tr",
  sw: "sw",
};

/** Dynamic import TS modules via tsx-less eval: read en.ts as text and parse keys */
async function loadEnFlat() {
  const { flattenMessages } = await import(toImportUrl("src/lib/i18n/flatten.ts"));
  const enMod = await import(toImportUrl("src/lib/i18n/messages/en.ts"));
  return flattenMessages(enMod.default);
}

async function loadExisting() {
  const mod = await import(toImportUrl("src/lib/i18n/translations/all.ts"));
  return mod.LOCALE_TRANSLATIONS;
}

function escapeStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

async function translateText(text, to) {
  if (!text.trim()) return text;
  try {
    const res = await translate(text, { to, from: "en" });
    return res.text;
  } catch (e) {
    console.warn(`  translate failed (${to}): ${text.slice(0, 40)}…`, e.message);
    return text;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const enFlat = await loadEnFlat();
  const existing = await loadExisting();
  const locales = Object.keys(LOCALE_BCP47);

  const missingByLocale = {};
  for (const loc of locales) {
    const missing = Object.keys(enFlat).filter((k) => !(k in (existing[loc] ?? {})));
    missingByLocale[loc] = missing;
    console.log(`${loc}: ${missing.length} missing keys`);
  }

  const allMissing = [...new Set(Object.values(missingByLocale).flat())];
  console.log(`Unique missing keys: ${allMissing.length}`);

  const supplement = {};

  for (const loc of locales) {
    supplement[loc] = {};
    const missing = missingByLocale[loc];
    console.log(`\nTranslating ${missing.length} keys for ${loc}…`);

    for (let i = 0; i < missing.length; i++) {
      const key = missing[i];
      const enText = enFlat[key];
      const translated = await translateText(enText, LOCALE_BCP47[loc]);
      supplement[loc][key] = translated;
      if ((i + 1) % 10 === 0) {
        console.log(`  ${loc}: ${i + 1}/${missing.length}`);
        await sleep(500);
      } else {
        await sleep(120);
      }
    }
  }

  const outPath = path.join(ROOT, "src/lib/i18n/translations/supplement.ts");
  let out = `/** Auto-generated — missing translation keys. Run: node scripts/generate-i18n-supplement.mjs */\n`;
  out += `import type { LocaleCode } from "@/lib/i18n/locales";\n\n`;
  out += `export const LOCALE_SUPPLEMENT: Partial<Record<Exclude<LocaleCode, "en">, Record<string, string>>> = {\n`;

  for (const loc of locales) {
    out += `  ${loc}: {\n`;
    for (const [key, value] of Object.entries(supplement[loc]).sort(([a], [b]) => a.localeCompare(b))) {
      out += `    "${key}": "${escapeStr(value)}",\n`;
    }
    out += `  },\n`;
  }
  out += `};\n`;

  fs.writeFileSync(outPath, out, "utf8");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
