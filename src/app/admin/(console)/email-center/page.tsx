import { Suspense } from "react";
import AdminEmailCenter from "@/components/admin/AdminEmailCenter";

export default function EmailCenterPage() {
  return (
    <Suspense fallback={<div className="text-[var(--admin-muted)] p-8">Loading Email Center…</div>}>
      <AdminEmailCenter />
    </Suspense>
  );
}
