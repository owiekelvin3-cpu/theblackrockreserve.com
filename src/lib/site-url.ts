/** Canonical public site URL — used in emails, sitemap, and metadata */
export function getSiteUrl(): string {
  const configured = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured?.trim()) return configured.replace(/\/$/, "");

  // Vercel injects VERCEL_URL (no protocol) on every deployment
  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "https://www.blackrockreserve.site";
}
