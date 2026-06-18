import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const appDir = path.join(root, "src", "app");
const svgPath = path.join(publicDir, "favicon.svg");

const SIZES = [48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512];

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });

async function loadIconBuffer(sharp) {
  if (!fs.existsSync(svgPath)) {
    throw new Error("Missing public/favicon.svg — the site icon is the single source for PWA icons");
  }

  return sharp(fs.readFileSync(svgPath)).resize(1024, 1024, { fit: "fill" }).png().toBuffer();
}

async function generateWithSharp() {
  const sharp = (await import("sharp")).default;
  const master = await loadIconBuffer(sharp);

  for (const size of SIZES) {
    const file = path.join(iconsDir, `icon-${size}.png`);
    await sharp(master).resize(size, size, { fit: "fill" }).png().toFile(file);
  }

  await sharp(master).resize(180, 180, { fit: "fill" }).png().toFile(path.join(publicDir, "apple-touch-icon.png"));

  // Next.js App Router file conventions — most reliable for iOS/Android install icons
  await sharp(master).resize(512, 512, { fit: "fill" }).png().toFile(path.join(appDir, "icon.png"));
  await sharp(master).resize(180, 180, { fit: "fill" }).png().toFile(path.join(appDir, "apple-icon.png"));

  const maskableSize = 512;
  const inner = Math.round(maskableSize * 0.76);
  const inset = Math.round((maskableSize - inner) / 2);
  const innerBuf = await sharp(master).resize(inner, inner, { fit: "fill" }).png().toBuffer();

  for (const size of [192, 512]) {
    const insetScaled = Math.round((size - Math.round(size * 0.76)) / 2);
    const innerScaled = size - insetScaled * 2;
    const innerSized = await sharp(master).resize(innerScaled, innerScaled, { fit: "fill" }).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 107, b: 26, alpha: 1 },
      },
    })
      .composite([{ input: innerSized, left: insetScaled, top: insetScaled }])
      .png()
      .toFile(path.join(iconsDir, `icon-maskable-${size}.png`));
  }

  console.log("PWA icons generated from public/favicon.svg (site icon)");
  console.log("Wrote src/app/icon.png and src/app/apple-icon.png for home-screen install");
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
