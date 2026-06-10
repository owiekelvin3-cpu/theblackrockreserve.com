import { NextResponse } from "next/server";
import { getPublicContactSettings } from "@/lib/platform-settings";

export async function GET() {
  try {
    const settings = await getPublicContactSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Contact settings error:", error);
    return NextResponse.json({ error: "Failed to load contact settings" }, { status: 500 });
  }
}
