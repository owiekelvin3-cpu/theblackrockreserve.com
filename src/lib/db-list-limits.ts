/** Default row cap for admin list queries (most recent first). */
export const ADMIN_LIST_DEFAULT_LIMIT = 300;

/** Hard maximum even when a caller passes a higher limit. */
export const ADMIN_LIST_MAX_LIMIT = 500;

export function clampAdminListLimit(limit?: number | null): number {
  if (limit == null || !Number.isFinite(limit) || limit < 1) {
    return ADMIN_LIST_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), ADMIN_LIST_MAX_LIMIT);
}
