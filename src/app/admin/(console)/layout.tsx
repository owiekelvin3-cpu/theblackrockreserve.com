"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminGate from "@/components/admin/AdminGate";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { AdminNotificationsProvider } from "@/components/admin/AdminNotificationsProvider";

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminNotificationsProvider>
      <AdminSidebar />
      <AdminGate>
        <div className="lg:pl-[240px] min-h-screen">
          <main className="p-6 lg:p-8 max-w-[1400px]">
            <AdminTopBar />
            {children}
          </main>
        </div>
      </AdminGate>
    </AdminNotificationsProvider>
  );
}
