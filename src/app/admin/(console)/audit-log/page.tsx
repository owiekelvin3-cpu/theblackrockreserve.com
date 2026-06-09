"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  admin: { name: string; email: string };
  targetUser: { id: string; name: string; email: string } | null;
}

export default function AdminAuditLogPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ logs: AuditLog[] }>(
    "/api/admin/audit-log?limit=100"
  );
  const logs = data?.logs ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Audit Log"
        description="Admin activity from Supabase — auto-refreshes every 30s"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <div className="admin-card overflow-hidden">
        <AdminFetchState
          loading={loading}
          error={error}
          onRetry={refresh}
          lastUpdated={lastUpdated}
          isEmpty={!loading && !error && logs.length === 0}
          emptyMessage="No admin actions logged yet"
        >
          <div className="divide-y divide-[var(--admin-border)]/50">
            {logs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-white/[0.02]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="admin-badge admin-badge-submitted">{log.action}</span>
                      <span className="text-xs text-[var(--admin-muted)]">by {log.admin.name}</span>
                      {log.targetUser && (
                        <Link href={`/admin/users/${log.targetUser.id}`} className="admin-link text-xs">
                          → {log.targetUser.name}
                        </Link>
                      )}
                    </div>
                    <pre className="mt-2 text-[10px] text-[var(--admin-muted)] overflow-x-auto max-w-2xl">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--admin-muted)]">{new Date(log.createdAt).toLocaleString()}</p>
                    {log.ipAddress && <p className="text-[10px] text-[var(--admin-muted)]">{log.ipAddress}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminFetchState>
      </div>
    </div>
  );
}
