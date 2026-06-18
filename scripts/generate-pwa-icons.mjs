import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const appDir = path.join(root, "src", "app");
const svgPath = path.join(publicDir, "favicon.svg");
const appSvgPath = path.join(appDir, "icon.svg");
const legacyAppIconPng = path.join(appDir, "icon.png");

const SIZES = [48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });

async function loadIconBuffer(sharp) {
  if (!fs.existsSync(svgPath)) {
    throw new Error("Missing public/favicon.svg — the site icon is the single source for PWA icons");
  }

  return sharp(fs.readFileSync(svgPath)).resize(1024, 1024, { fit: "fill" }).png().toBuffer();
}

async function writeAppleIcons(sharp, master) {
  const targets = [
    path.join(publicDir, "apple-touch-icon.png"),
    path.join(publicDir, "apple-icon.png"),
    path.join(appDir, "apple-icon.png"),
  ];

  for (const file of targets) {
    await sharp(master).resize(180, 180, { fit: "fill" }).png().toFile(file);
  }
}

async function generateWithSharp() {
  const sharp = (await import("sharp")).default;
  const master = await loadIconBuffer(sharp);

  fs.copyFileSync(svgPath, appSvgPath);
  if (fs.existsSync(legacyAppIconPng)) {
    fs.unlinkSync(legacyAppIconPng);
  }

  for (const size of SIZES) {
    const file = path.join(iconsDir, `icon-${size}.png`);
    await sharp(master).resize(size, size, { fit: "fill" }).png().toFile(file);
  }

  await writeAppleIcons(sharp, master);

  // Full-bleed maskable icons — same artwork as the site icon (no letter fallback padding).
  for (const size of [192, 512]) {
    await sharp(master)
      .resize(size, size, { fit: "fill" })
      .png()
      .toFile(path.join(iconsDir, `icon-maskable-${size}.png`));
  }

  console.log("PWA icons generated from public/favicon.svg (site icon)");
  console.log("Synced src/app/icon.svg and apple-icon.png for desktop + mobile install");
}

async function main() {
  try {
    await generateWithSharp();
  } catch (error) {
    console.warn("PWA icon generation skipped:", error instanceof Error ? error.message : error);
    process.exit(0);
  }
}

main();
