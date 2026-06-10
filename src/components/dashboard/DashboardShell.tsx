"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import DashboardMobileNav from "@/components/dashboard/DashboardMobileNav";
import { DashboardLayoutProvider } from "@/components/dashboard/DashboardLayoutContext";
import { ProfileImageProvider } from "@/components/providers/ProfileImageProvider";

export default function DashboardShell({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      <DashboardLayoutProvider>
        <ProfileImageProvider>
        <div className="dash-layout min-h-[100dvh] overflow-x-hidden">
          <DashboardSidebar />
          <div className="lg:ml-[260px] min-h-[100dvh] flex flex-col">
            <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-2 lg:pt-8 max-w-[1500px] w-full mx-auto dash-main-pad">
              <DashboardTopBar />
              {children}
            </main>
            <DashboardMobileNav />
          </div>
        </div>
        </ProfileImageProvider>
      </DashboardLayoutProvider>
    </SessionProvider>
  );
}
