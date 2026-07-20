import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getUserPhysicalCardsDashboard, createPhysicalCardRequest } from "@/lib/physical-cards";
import { physicalCardOrderSchema } from "@/lib/validations";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const data = await getUserPhysicalCardsDashboard(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Physical cards GET error:", error);
    return NextResponse.json({ error: "Failed to load card information" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = physicalCardOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid card request" },
        { status: 400 }
      );
    }

    const request = await createPhysicalCardRequest(userId, parsed.data);
    invalidateAdminCaches();
    return NextResponse.json({ success: true, request });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit card request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
