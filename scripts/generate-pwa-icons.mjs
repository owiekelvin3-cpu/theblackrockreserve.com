import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const svgPath = path.join(root, "public", "favicon.svg");

fs.mkdirSync(iconsDir, { recursive: true });

async function generateWithSharp() {
  const sharp = (await import("sharp")).default;
  const svg = fs.readFileSync(svgPath);

  await sharp(svg).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(root, "public", "apple-touch-icon.png"));
  await sharp(svg)
    .resize(512, 512, { fit: "contain", background: { r: 18, g: 18, b: 20, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));

  console.log("PWA icons generated with sharp");
}

async function main() {
  try {
    await generateWithSharp();
  } catch (error) {
    console.warn("PWA icon generation skipped:", error instanceof Error ? error.message : error);
    const fallbackNote = path.join(iconsDir, "README.txt");
    if (!fs.existsSync(path.join(iconsDir, "icon-192.png"))) {
      fs.writeFileSync(
        fallbackNote,
        "Run: npm i -D sharp && node scripts/generate-pwa-icons.mjs\n"
      );
    }
    process.exit(0);
  }
}

main();
