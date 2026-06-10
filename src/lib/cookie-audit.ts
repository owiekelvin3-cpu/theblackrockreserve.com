/** Vercel/nginx often reject Cookie headers above ~8–32 KB (494 REQUEST_HEADER_TOO_LARGE) */

export const COOKIE_WARN_BYTES = 4096;
export const COOKIE_CRITICAL_BYTES = 8192;

export type CookieSizeEntry = { name: string; bytes: number };

export function parseCookieSizes(cookieHeader: string): CookieSizeEntry[] {
  if (!cookieHeader.trim()) return [];
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      const name = eq === -1 ? part : part.slice(0, eq);
      return { name, bytes: part.length };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

export function auditCookieHeader(cookieHeader: string | null, path?: string) {
  if (!cookieHeader) return null;

  const total = cookieHeader.length;
  if (total < COOKIE_WARN_BYTES) return null;

  const cookies = parseCookieSizes(cookieHeader);
  const payload = {
    path: path ?? "unknown",
    totalBytes: total,
    critical: total >= COOKIE_CRITICAL_BYTES,
    cookies,
    largest: cookies[0] ?? null,
  };

  if (total >= COOKIE_CRITICAL_BYTES) {
    console.error("[cookie-audit] CRITICAL — Cookie header may cause 494 REQUEST_HEADER_TOO_LARGE", payload);
  } else {
    console.warn("[cookie-audit] WARNING — Cookie header approaching size limits", payload);
  }

  return payload;
}

/** Fields that must never be persisted inside NextAuth JWT session cookies */
export const JWT_BLOAT_KEYS = [
  "picture",
  "image",
  "profileImage",
  "avatar",
  "data",
  "user",
  "account",
  "transactions",
  "notifications",
  "settings",
] as const;

export function stripJwtBloat<T extends Record<string, unknown>>(token: T): T {
  const out = { ...token };
  for (const key of JWT_BLOAT_KEYS) {
    if (key in out) delete out[key];
  }
  return out;
}
