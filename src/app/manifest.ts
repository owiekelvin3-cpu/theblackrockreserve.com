import type { MetadataRoute } from "next";

const ICON_SIZES = [48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512] as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BlackrockReserve",
    short_name: "Blackrock",
    description:
      "Premium digital banking, smart investments, and wealth management.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FF6B1A",
    theme_color: "#FF6B1A",
    categories: ["finance", "business"],
    icons: [
      ...ICON_SIZES.map((size) => ({
        src: `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png" as const,
        purpose: "any" as const,
      })),
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
  };
}
