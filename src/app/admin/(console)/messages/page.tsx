"use client";

import { useEffect, useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

interface MessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ messages: MessageRow[] }>("/api/admin/messages");
  const [selected, setSelected] = useState<MessageRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const list = data?.messages ?? [];
    if (list.length === 0) {
      setSelected(null);
      return;
    }
    if (!selected || !list.some((m) => m.id === selected.id)) {
      setSelected(list[0]);
    }
  }, [data, selected]);

  const messages = data?.messages ?? [];

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message from the database?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Message deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Contact Messages"
        description="Support inbox from Supabase — auto-refreshes every 30s"
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
        isEmpty={!loading && !error && messages.length === 0}
        emptyMessage="No contact messages in the database"
      >
        <div className="grid lg:grid-cols-5 gap-4 h-[calc(100vh-220px)] min-h-[400px]">
          <div className="lg:col-span-2 admin-card overflow-y-auto">
            {messages.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`w-full text-left p-4 border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02] transition-colors ${
                  selected?.id === m.id ? "bg-accent-brand/10 border-l-2 border-l-accent-brand" : ""
                }`}
              >
                <p className="text-sm font-medium text-white truncate">{m.subject}</p>
                <p className="text-xs text-[var(--admin-muted)] mt-0.5">{m.name}</p>
                <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 admin-card p-6 overflow-y-auto">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-6 pb-4 border-b border-[var(--admin-border)]">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent-brand/20 flex items-center justify-center">
                      <Mail size={18} className="text-accent-brand" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">{selected.subject}</h2>
                      <p className="text-sm text-[var(--admin-muted)]">{selected.name} · {selected.email}</p>
                      <p className="text-xs text-[var(--admin-muted)] mt-1">
                        {new Date(selected.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteMessage(selected.id)}
                    disabled={deleting === selected.id}
                    className="admin-btn-ghost text-red-400 text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                <p className="text-sm text-[var(--admin-muted)] leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </>
            ) : (
              <p className="text-[var(--admin-muted)]">Select a message</p>
            )}
          </div>
        </div>
      </AdminFetchState>
    </div>
  );
}
