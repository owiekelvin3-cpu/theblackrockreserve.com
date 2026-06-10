"use client";

import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import DashboardMobileNav from "@/components/dashboard/DashboardMobileNav";
import DashboardAuthGuard from "@/components/dashboard/DashboardAuthGuard";
import { DashboardLayoutProvider } from "@/components/dashboard/DashboardLayoutContext";

/** Client-side auth fallback when server session is unavailable */
export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <DashboardLayoutProvider>
        <div className="dash-layout min-h-[100dvh] overflow-x-hidden">
          <DashboardSidebar />
          <div className="lg:ml-[260px] min-h-[100dvh] flex flex-col">
            <main className="flex-1 px-4 pt-1 pb-4 sm:p-6 lg:p-8 lg:pt-8 max-w-[1500px] w-full mx-auto dash-main-pad">
              <DashboardTopBar />
              {children}
            </main>
            <DashboardMobileNav />
          </div>
        </div>
      </DashboardLayoutProvider>
    </DashboardAuthGuard>
  );
}
