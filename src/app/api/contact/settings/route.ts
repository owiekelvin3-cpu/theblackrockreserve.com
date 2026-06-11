import { NextResponse } from "next/server";
import { getPublicContactSettings } from "@/lib/platform-settings";

export const revalidate = 300;

export async function GET() {
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
