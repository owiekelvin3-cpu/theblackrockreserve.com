import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { adminProofImageResponse } from "@/lib/admin-proof-image-route";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const payment = await prisma.imfClearancePayment.findUnique({
    where: { id: params.id },
    select: { proofImage: true },
  });

  return adminProofImageResponse(payment?.proofImage);
}
