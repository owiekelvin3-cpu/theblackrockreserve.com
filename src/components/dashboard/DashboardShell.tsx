"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";

export default function DashboardShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      <div className="dash-layout min-h-screen">
        <DashboardSidebar />
        <div className="lg:ml-[260px] min-h-screen">
          <main className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-[1500px]">
            <DashboardTopBar />
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
