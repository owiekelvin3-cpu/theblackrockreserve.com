import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isKycBlockingAccess } from "@/lib/kyc";
import KycPanel from "@/components/auth/KycPanel";

export const metadata = {
  title: "Identity Verification",
};

export default async function KycPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/kyc&error=sign_in_required");
  }
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycRequired: true, kycStatus: true },
  });

  if (!user || !isKycBlockingAccess(user)) {
    redirect("/dashboard");
  }

  return <KycPanel />;
}
