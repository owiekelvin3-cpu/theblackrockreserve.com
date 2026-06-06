const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

const RECOMMENDED_IN_PRODUCTION = ["GMAIL_USER", "GMAIL_APP_PASSWORD"] as const;

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(`[Platinum Crest] Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.ADMIN_PASSWORDLESS === "true") {
    console.error("[Platinum Crest] ADMIN_PASSWORDLESS must not be enabled in production.");
  }

  const secret = process.env.NEXTAUTH_SECRET ?? "";
  if (secret.length < 32) {
    console.error("[Platinum Crest] NEXTAUTH_SECRET should be at least 32 characters.");
  }

  const siteUrl = process.env.NEXTAUTH_URL ?? "";
  if (siteUrl.startsWith("http://") && !siteUrl.includes("localhost")) {
    console.error("[Platinum Crest] NEXTAUTH_URL should use https:// in production.");
  }

  const recommended = RECOMMENDED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());
  if (recommended.length > 0) {
    console.warn(`[Platinum Crest] Recommended for production: ${recommended.join(", ")}`);
  }
}
