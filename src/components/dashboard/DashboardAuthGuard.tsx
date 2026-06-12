"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Skeleton from "@/components/ui/Skeleton";

/** Blocks the dashboard until a verified customer session is present */
export default function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    const loginUrl = `/login?callbackUrl=${encodeURIComponent(pathname)}`;

    if (status === "unauthenticated") {
      router.replace(`${loginUrl}&error=sign_in_required`);
      return;
    }

    if (session?.user?.role === "ADMIN") {
      router.replace("/admin");
      return;
    }

  }, [status, session, router, pathname]);

  const allowed =
    status === "authenticated" &&
    session?.user?.role === "USER";

  if (status === "loading" || !allowed) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4 px-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  return <>{children}</>;
}
