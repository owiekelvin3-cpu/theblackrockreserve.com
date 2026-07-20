import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { loanApplicationSchema } from "@/lib/validations";
import { submitLoanApplication } from "@/lib/loan-service";
import {
  getUserName,
  notifyAdminsLoanSubmitted,
  notifyLoanApplicationSubmitted,
} from "@/lib/loan-notifications";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = loanApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid application" },
        { status: 400 }
      );
    }

    const application = await submitLoanApplication(userId, parsed.data);

    await notifyLoanApplicationSubmitted(
      userId,
      application.id,
      application.applicationNumber,
      application.product.name
    );
    const userName = await getUserName(userId);
    await notifyAdminsLoanSubmitted(userName, application.applicationNumber, application.product.name);
    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status,
        productName: application.product.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Application failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
