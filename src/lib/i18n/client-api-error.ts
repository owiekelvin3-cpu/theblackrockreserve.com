"use client";

import { translateApiErrorMessage } from "@/lib/i18n/api-i18n";

/** Translate a raw API error string for display in the UI. */
export function useApiErrorMessage(
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  return (message: string) => translateApiErrorMessage(message, t);
}
