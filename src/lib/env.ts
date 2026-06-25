const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const RECOMMENDED_IN_PRODUCTION = ["GMAIL_USER", "GMAIL_APP_PASSWORD", "EMAIL_FROM"] as const;

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(`[Blackrock Reserve] Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.ADMIN_PASSWORDLESS === "true") {
    console.error("[Blackrock Reserve] ADMIN_PASSWORDLESS must not be enabled in production.");
  }

  const secret = process.env.NEXTAUTH_SECRET ?? "";
  if (secret.length < 32) {
    console.error("[Blackrock Reserve] NEXTAUTH_SECRET should be at least 32 characters.");
  }

  const siteUrl = process.env.NEXTAUTH_URL ?? "";
  if (siteUrl.startsWith("http://") && !siteUrl.includes("localhost")) {
    console.error("[Blackrock Reserve] NEXTAUTH_URL should use https:// in production.");
  }

  const recommended = RECOMMENDED_IN_PRODUCTION.filter((key) => !process.env[key]?.trim());
  if (recommended.length > 0) {
    console.warn(`[Blackrock Reserve] Recommended for production: ${recommended.join(", ")}`);
  }
}
