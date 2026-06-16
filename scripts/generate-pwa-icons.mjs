import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const sourcePath = path.join(root, "public", "brand", "app-icon-source.png");
const svgPath = path.join(root, "public", "favicon.svg");

fs.mkdirSync(iconsDir, { recursive: true });

async function loadIconPipeline(sharp) {
  if (fs.existsSync(sourcePath)) {
    const trimmed = await sharp(sourcePath).trim({ threshold: 12 }).png().toBuffer();
    return sharp(trimmed);
  }

  if (fs.existsSync(svgPath)) {
    return sharp(fs.readFileSync(svgPath));
  }

  throw new Error("No icon source found (public/brand/app-icon-source.png or public/favicon.svg)");
}

async function generateWithSharp() {
  const sharp = (await import("sharp")).default;
  const icon = await loadIconPipeline(sharp);

  await icon.clone().resize(192, 192, { fit: "contain" }).png().toFile(path.join(iconsDir, "icon-192.png"));
  await icon.clone().resize(512, 512, { fit: "contain" }).png().toFile(path.join(iconsDir, "icon-512.png"));
  await icon.clone().resize(180, 180, { fit: "contain" }).png().toFile(path.join(root, "public", "apple-touch-icon.png"));

  // Maskable: ~80% safe zone on black background for Android adaptive icons
  const maskableSize = 512;
  const inner = Math.round(maskableSize * 0.72);
  const inset = Math.round((maskableSize - inner) / 2);
  const innerBuf = await icon.clone().resize(inner, inner, { fit: "contain" }).png().toBuffer();
  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: innerBuf, left: inset, top: inset }])
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512.png"));

  console.log(
    fs.existsSync(sourcePath)
      ? "PWA icons generated from public/brand/app-icon-source.png"
      : "PWA icons generated from public/favicon.svg"
  );
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
        "Add public/brand/app-icon-source.png then run: node scripts/generate-pwa-icons.mjs\n"
      );
    }
    process.exit(0);
  }
}

main();
