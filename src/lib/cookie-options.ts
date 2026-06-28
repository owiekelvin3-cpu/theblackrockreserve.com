/** Shared cookie flags — Safari/iOS friendly (first-party, Lax, Secure on HTTPS). */
export function secureCookieFlags() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: isProd,
  };
}

export const NEXT_AUTH_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.pkce.code_verifier",
  "next-auth.pkce.code_verifier",
  "__Secure-next-auth.state",
  "next-auth.state",
] as const;

export const PREFERENCE_COOKIE_NAMES = ["br-locale", "br-currency"] as const;

/** Reject open redirects — only same-origin relative paths. */
export function safeRedirectPath(path: string | null | undefined, fallback = "/login"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}
