export type GeoLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
};

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return true;
  }
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function formatUserLocation(parts: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string | null {
  const label = [parts.city, parts.region, parts.country].filter(Boolean).join(", ");
  return label || null;
}

export async function lookupIpLocation(ip?: string): Promise<GeoLocation | null> {
  if (!ip || ip === "unknown" || isPrivateIp(ip)) return null;

  try {
    const res = await fetch(
      `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`,
      { signal: AbortSignal.timeout(4000), cache: "no-store" }
    );
    const data = (await res.json()) as {
      status?: string;
      city?: string;
      regionName?: string;
      country?: string;
    };
    if (data.status !== "success") return null;
    return {
      city: data.city ?? null,
      region: data.regionName ?? null,
      country: data.country ?? null,
    };
  } catch {
    return null;
  }
}
