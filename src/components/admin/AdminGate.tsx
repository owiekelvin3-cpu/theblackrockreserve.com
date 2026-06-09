"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Skeleton from "@/components/ui/Skeleton";

interface AdminGateProps {
  children: React.ReactNode;
}

export default function AdminGate({ children }: AdminGateProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/admin/login");
      return;
    }
    if (session?.user?.role !== "ADMIN") {
      router.replace("/admin/login?error=not_admin");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="lg:pl-[240px] p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "ADMIN") {
    return (
      <div className="lg:pl-[240px] p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
