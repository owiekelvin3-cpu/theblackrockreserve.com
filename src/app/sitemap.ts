import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://platinumcrest.com";

  const routes = [
    "",
    "/about",
    "/features",
    "/investments",
    "/contact",
    "/login",
    "/register",
    "/privacy",
    "/terms",
    "/cookies",
    "/disclosures",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
