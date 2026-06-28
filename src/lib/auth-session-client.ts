import { getSession } from "next-auth/react";

/** Safari often delays committing Set-Cookie after signIn(redirect:false). Poll before navigation. */
export async function waitForSessionRole(
  role: "USER" | "ADMIN",
  maxAttempts = 18,
  delayMs = 200
) {
  for (let i = 0; i < maxAttempts; i++) {
    const session = await getSession();
    if (session?.user?.role === role) return session;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return getSession();
}
