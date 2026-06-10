import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getJointAccountDetail } from "@/lib/joint-account-service";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const account = await getJointAccountDetail(params.id, userId);
    return NextResponse.json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load account";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
