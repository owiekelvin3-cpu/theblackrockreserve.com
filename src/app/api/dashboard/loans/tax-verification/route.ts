import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { taxRefundVerificationSchema } from "@/lib/validations";
import { submitTaxRefundVerification } from "@/lib/loan-service";
import {
  getUserName,
  notifyAdminsTaxRefundSubmitted,
  notifyTaxRefundSubmitted,
} from "@/lib/loan-notifications";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = taxRefundVerificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid form data" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (user?.status === "SUSPENDED") {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const record = await submitTaxRefundVerification(userId, {
      ...parsed.data,
      declarationAccepted: true,
    });

    await notifyTaxRefundSubmitted(userId, record.id, record.applicationNumber);
    const userName = await getUserName(userId);
    await notifyAdminsTaxRefundSubmitted(userName, record.applicationNumber);
    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      applicationNumber: record.applicationNumber,
      status: record.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
