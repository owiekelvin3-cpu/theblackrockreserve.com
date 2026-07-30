/** Short-lived in-process cache so uptime monitors do not hit Postgres on every request. */
const DB_CHECK_TTL_MS = 60_000;

let lastCheck: { ok: boolean; checkedAt: number; error: string | null } | null = null;

export function getCachedDbHealth(): { ok: boolean; fromCache: boolean; error: string | null } | null {
  if (!lastCheck) return null;
  if (Date.now() - lastCheck.checkedAt > DB_CHECK_TTL_MS) return null;
  return { ok: lastCheck.ok, fromCache: true, error: lastCheck.error };
}

export function setCachedDbHealth(ok: boolean, error: string | null) {
  lastCheck = { ok, checkedAt: Date.now(), error };
}
