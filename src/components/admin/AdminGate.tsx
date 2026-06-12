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

  useEffect(() => {
    if (status !== "loading") return;
    const timeout = window.setTimeout(() => {
      router.replace("/admin/login?error=session_timeout");
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="lg:pl-[240px] p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-[1400px] mx-auto w-full space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "ADMIN") {
    return (
      <div className="lg:pl-[240px] p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-[1400px] mx-auto w-full space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
