"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminReviewQueue,
  AdminReviewCard,
  AdminKycBadge,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { toast } from "sonner";

interface KycRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  kycStatus: string;
  kycIdType?: string | null;
  kycIdNumber?: string | null;
  kycAddress?: string | null;
  kycIdFront?: string | null;
  kycIdBack?: string | null;
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
      toast.success(kycStatus === "VERIFIED" ? "KYC approved" : "KYC rejected");
      refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="KYC Review"
        description="New-account identity queue — auto-refreshes every 30s"
        action={<AdminRefreshButton onClick={refresh} />}
      />

      <AdminFetchState
        loading={loading}
        error={error}
        onRetry={refresh}
        lastUpdated={lastUpdated}
        isEmpty={!loading && !error && queue.length === 0}
        emptyMessage="No pending KYC reviews for new accounts"
      >
        <AdminReviewQueue>
          {queue.map((u) => (
            <AdminReviewCard key={u.id}>
              <div className="min-w-0 w-full space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-accent-brand transition-colors">
                      {u.name}
                    </Link>
                    <p className="text-sm text-[var(--admin-muted)]">{u.email}</p>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <AdminKycBadge status={u.kycStatus} />
                      {u.kycIdType && (
                        <span className="text-[10px] uppercase text-[var(--admin-muted)]">
                          {u.kycIdType.replaceAll("_", " ")}
                          {u.kycIdNumber ? ` · ${u.kycIdNumber}` : ""}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--admin-muted)]">
                        Updated {new Date(u.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {(u.phone || u.country || u.kycAddress) && (
                      <p className="text-xs text-[var(--admin-muted)] mt-2">
                        {[u.phone, u.country, u.kycAddress].filter(Boolean).join(" · ")}
                      </p>
                    )}
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
                {(u.kycIdFront || u.kycIdBack) && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {u.kycIdFront && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.kycIdFront} alt={`${u.name} ID front`} className="rounded-lg max-h-44 w-full object-contain border border-[var(--admin-border)] bg-black/20" />
                    )}
                    {u.kycIdBack && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.kycIdBack} alt={`${u.name} ID back`} className="rounded-lg max-h-44 w-full object-contain border border-[var(--admin-border)] bg-black/20" />
                    )}
                  </div>
                )}
              </div>
            </AdminReviewCard>
          ))}
        </AdminReviewQueue>
      </AdminFetchState>
    </AdminPage>
  );
}
