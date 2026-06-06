export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 30000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchDashboardJson<T>(
  url: string,
  timeoutMs = 30000
): Promise<{ data: T | null; error: boolean }> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { data: null, error: true };
    return { data: (await res.json()) as T, error: false };
  } catch {
    return { data: null, error: true };
  }
}
