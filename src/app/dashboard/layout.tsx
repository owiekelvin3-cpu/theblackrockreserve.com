import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isNextAuthConfigured } from "@/lib/auth-config";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DashboardClientLayout from "@/components/dashboard/DashboardClientLayout";
import "./dashboard-theme.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isNextAuthConfigured()) {
    return <DashboardClientLayout>{children}</DashboardClientLayout>;
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?error=sign_in_required&callbackUrl=/dashboard");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}
