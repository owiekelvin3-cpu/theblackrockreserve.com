/** Canonical public site URL — used in emails, sitemap, and metadata */
export function getSiteUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "https://platinumcrest.com";
}
