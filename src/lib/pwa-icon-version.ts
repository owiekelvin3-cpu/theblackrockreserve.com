/** Bump when regenerating PWA / favicon assets so browsers fetch fresh icons. */
export const PWA_ICON_VERSION = "8";

export function pwaIconUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}?v=${PWA_ICON_VERSION}`;
}
