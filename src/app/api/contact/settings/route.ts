import { NextRequest, NextResponse } from "next/server";
import { getPublicContactSettings } from "@/lib/platform-settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request) ?? "anonymous";
  const limited = checkRateLimit(`contact:settings:${ip}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const settings = await getPublicContactSettings();
    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Contact settings error:", error);
    return NextResponse.json({ error: "Failed to load contact settings" }, { status: 500 });
  }
}
