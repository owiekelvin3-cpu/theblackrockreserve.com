import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getUserJointAccounts, checkJointEligibility } from "@/lib/joint-account-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, emailVerified: true, kycStatus: true },
    });
    const accounts = await getUserJointAccounts(userId);
    const eligibility = user ? checkJointEligibility(user) : { eligible: false, requirements: [] };
    return NextResponse.json({ accounts, eligibility });
  } catch (error) {
    console.error("Joint accounts GET error:", error);
    return NextResponse.json({ error: "Failed to load joint accounts" }, { status: 500 });
  }
}
