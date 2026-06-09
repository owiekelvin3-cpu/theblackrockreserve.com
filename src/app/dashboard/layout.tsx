import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?error=sign_in_required");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  if (!session.user.emailVerified) {
    redirect("/login?error=verify_email");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
