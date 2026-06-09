"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { AdminPageHeader, AdminKycBadge } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { toast } from "sonner";

interface KycRow {
  id: string;
  name: string;
  email: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminKycPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ queue: KycRow[] }>("/api/admin/kyc");
  const queue = data?.queue ?? [];
  const [updating, setUpdating] = useState<string | null>(null);

  const updateKyc = async (id: string, kycStatus: "VERIFIED" | "REJECTED") => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kycStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`KYC ${kycStatus.toLowerCase()}`);
      refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="KYC Review"
        description="Identity verification queue from Supabase — auto-refreshes every 30s"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <AdminFetchState
        loading={loading}
        error={error}
        onRetry={refresh}
        lastUpdated={lastUpdated}
        isEmpty={!loading && !error && queue.length === 0}
        emptyMessage="No pending KYC reviews in the database"
      >
        <div className="space-y-4">
          {queue.map((u) => (
            <div key={u.id} className="admin-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Link href={`/admin/users/${u.id}`} className="text-white font-medium hover:text-accent-brand">
                  {u.name}
                </Link>
                <p className="text-sm text-[var(--admin-muted)]">{u.email}</p>
                <div className="mt-2 flex items-center gap-3">
                  <AdminKycBadge status={u.kycStatus} />
                  <span className="text-[10px] text-[var(--admin-muted)]">
                    Updated {new Date(u.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => updateKyc(u.id, "VERIFIED")}
                  disabled={updating === u.id || u.kycStatus === "VERIFIED"}
                  className="admin-btn-primary flex items-center gap-1.5 text-xs disabled:opacity-40"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => updateKyc(u.id, "REJECTED")}
                  disabled={updating === u.id || u.kycStatus === "REJECTED"}
                  className="admin-btn-ghost flex items-center gap-1.5 text-xs text-red-400 border-red-500/30 disabled:opacity-40"
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </AdminFetchState>
    </div>
  );
}
