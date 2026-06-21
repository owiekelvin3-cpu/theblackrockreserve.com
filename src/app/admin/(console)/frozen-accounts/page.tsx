"use client";

import { Suspense } from "react";
import AdminAccountFreezeConsole from "@/components/admin/AdminAccountFreezeConsole";

function LoadingShell() {
  return (
    <div className="admin-page p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-white/10 rounded-lg" />
        <div className="h-4 w-96 bg-white/5 rounded" />
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AdminFrozenAccountsPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <AdminAccountFreezeConsole />
    </Suspense>
  );
}
