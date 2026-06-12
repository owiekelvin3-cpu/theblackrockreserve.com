"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, MessageSquare, RefreshCw, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import Skeleton from "@/components/ui/Skeleton";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

interface ContactRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface ConversationRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  adminUnread: boolean;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
}

interface ThreadMessage {
  id: string;
  role: "USER" | "ADMIN" | "SYSTEM";
  content: string;
  createdAt: string;
  adminName?: string;
}

interface ConversationDetail {
  id: string;
  status: string;
  user: { id: string; name: string; email: string };
  messages: ThreadMessage[];
}

type InboxItem =
  | { kind: "chat"; id: string; sortAt: string; row: ConversationRow }
  | { kind: "contact"; id: string; sortAt: string; row: ContactRow };

type MessagesPayload = {
  messages: ContactRow[];
  conversations: ConversationRow[];
  partialError?: string;
};

type Selection =
  | { kind: "chat"; id: string }
  | { kind: "contact"; id: string }
  | null;

export default function AdminMessagesPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<MessagesPayload>(
    "/api/admin/messages",
    { pollMs: 30_000 }
  );
  const [selection, setSelection] = useState<Selection>(null);
  const [thread, setThread] = useState<ConversationDetail | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const partialErrorShown = useRef(false);

  const contacts = useMemo(() => data?.messages ?? [], [data?.messages]);
  const conversations = useMemo(() => data?.conversations ?? [], [data?.conversations]);

  const inbox = useMemo(() => {
    const items: InboxItem[] = [
      ...conversations.map(
        (row): InboxItem => ({
          kind: "chat",
          id: row.id,
          sortAt: row.lastMessageAt,
          row,
        })
      ),
      ...contacts.map(
        (row): InboxItem => ({
          kind: "contact",
          id: row.id,
          sortAt: row.createdAt,
          row,
        })
      ),
    ];
    return items.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
  }, [conversations, contacts]);

  const selectedContact = useMemo(
    () =>
      selection?.kind === "contact"
        ? contacts.find((m) => m.id === selection.id) ?? null
        : null,
    [selection, contacts]
  );

  useEffect(() => {
    if (data?.partialError && !partialErrorShown.current) {
      partialErrorShown.current = true;
      toast.error(data.partialError);
    }
  }, [data?.partialError]);

  useEffect(() => {
    if (loading || inbox.length === 0) {
      if (inbox.length === 0) setSelection(null);
      return;
    }
    if (
      !selection ||
      !inbox.some((item) => item.kind === selection.kind && item.id === selection.id)
    ) {
      const firstUnreadChat = inbox.find(
        (item) => item.kind === "chat" && item.row.adminUnread
      );
      const first = firstUnreadChat ?? inbox[0];
      setSelection({ kind: first.kind, id: first.id });
    }
  }, [loading, inbox, selection]);

  const loadThread = useCallback(async (id: string, silent = false) => {
    if (!silent) {
      setThreadLoading(true);
      setThreadError(null);
    }

    try {
      const res = await fetch(`/api/admin/messages/conversations/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load conversation");
      setThread(json.conversation);
      setThreadError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load conversation";
      if (!silent) {
        setThread(null);
        setThreadError(message);
        toast.error(message);
      }
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selection?.kind !== "chat") {
      setThread(null);
      setThreadError(null);
      return;
    }

    setThread((current) => (current?.id === selection.id ? current : null));
    loadThread(selection.id);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadThread(selection.id, true);
      }
    }, 12_000);

    return () => window.clearInterval(timer);
  }, [selection, loadThread]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages, threadLoading]);

  const sendReply = async () => {
    if (selection?.kind !== "chat" || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/messages/conversations/${selection.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reply");
      setThread(json.conversation);
      setReply("");
      toast.success("Reply sent to client");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact form message?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Message deleted");
      if (selection?.kind === "contact" && selection.id === id) {
        setSelection(null);
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const unreadChats = conversations.filter((c) => c.adminUnread).length;
  const threadReady = selection?.kind === "chat" && thread?.id === selection.id;

  return (
    <div>
      <AdminPageHeader
        title="Messages"
        description="Support chats and contact form submissions in one inbox — refreshes every 30s"
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
        isEmpty={!loading && !error && inbox.length === 0}
        emptyMessage="No messages yet. Support chats appear when clients use Human Support; contact form submissions appear here too."
      >
        <div className="grid lg:grid-cols-5 gap-4 min-h-[480px] lg:h-[calc(100vh-240px)]">
          {/* Inbox list */}
          <div className="lg:col-span-2 admin-card overflow-y-auto max-h-[320px] lg:max-h-none">
            {inbox.map((item) => {
              const active =
                selection?.kind === item.kind && selection.id === item.id;

              if (item.kind === "chat") {
                const c = item.row;
                return (
                  <button
                    key={`chat-${c.id}`}
                    type="button"
                    onClick={() => setSelection({ kind: "chat", id: c.id })}
                    className={`w-full text-left p-4 border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02] transition-colors ${
                      active ? "bg-accent-brand/10 border-l-2 border-l-accent-brand" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare size={14} className="text-accent-brand shrink-0" />
                        <p className="text-sm font-medium text-white truncate">{c.userName}</p>
                      </div>
                      {c.adminUnread && (
                        <span className="shrink-0 h-2 w-2 rounded-full bg-accent-brand" />
                      )}
                    </div>
                    <p className="text-[10px] text-accent-brand/80 mt-1 uppercase tracking-wide">
                      Support chat
                    </p>
                    <p className="text-xs text-[var(--admin-muted)] mt-1 truncate">{c.userEmail}</p>
                    <p className="text-xs text-[var(--admin-muted)] mt-2 line-clamp-2">{c.lastMessage}</p>
                    <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </p>
                  </button>
                );
              }

              const m = item.row;
              return (
                <button
                  key={`contact-${m.id}`}
                  type="button"
                  onClick={() => setSelection({ kind: "contact", id: m.id })}
                  className={`w-full text-left p-4 border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02] transition-colors ${
                    active ? "bg-accent-brand/10 border-l-2 border-l-accent-brand" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={14} className="text-[var(--admin-muted)] shrink-0" />
                    <p className="text-sm font-medium text-white truncate">{m.subject}</p>
                  </div>
                  <p className="text-[10px] text-[var(--admin-muted)] mt-1 uppercase tracking-wide">
                    Contact form
                  </p>
                  <p className="text-xs text-[var(--admin-muted)] mt-1">{m.name}</p>
                  <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 admin-card flex flex-col min-h-[360px] lg:min-h-0">
            {!selection ? (
              <p className="p-6 text-[var(--admin-muted)]">Select a message from the inbox</p>
            ) : selection.kind === "contact" && selectedContact ? (
              <div className="p-6 overflow-y-auto">
                <div className="flex items-start justify-between gap-3 mb-6 pb-4 border-b border-[var(--admin-border)]">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent-brand/20 flex items-center justify-center">
                      <Mail size={18} className="text-accent-brand" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wide mb-1">
                        Contact form
                      </p>
                      <h2 className="font-semibold text-white">{selectedContact.subject}</h2>
                      <p className="text-sm text-[var(--admin-muted)]">
                        {selectedContact.name} · {selectedContact.email}
                      </p>
                      <p className="text-xs text-[var(--admin-muted)] mt-1">
                        {new Date(selectedContact.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteContact(selectedContact.id)}
                    disabled={deleting === selectedContact.id}
                    className="admin-btn-ghost text-red-400 text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                <p className="text-sm text-[var(--admin-muted)] leading-relaxed whitespace-pre-wrap">
                  {selectedContact.message}
                </p>
                <p className="text-xs text-[var(--admin-muted)] mt-6 pt-4 border-t border-[var(--admin-border)]">
                  Reply to this client at <strong className="text-white">{selectedContact.email}</strong> or
                  respond in Support Chat if they have a dashboard account.
                </p>
              </div>
            ) : selection.kind === "chat" ? (
              threadLoading && !threadReady ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-48 rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-3/4 rounded-2xl ml-auto" />
                </div>
              ) : threadError ? (
                <div className="p-8 text-center">
                  <p className="text-white font-medium">Could not load this conversation</p>
                  <p className="text-sm text-[var(--admin-muted)] mt-2">{threadError}</p>
                  <button
                    type="button"
                    onClick={() => loadThread(selection.id)}
                    className="admin-btn-primary text-xs px-4 py-2 mt-4 inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Try again
                  </button>
                </div>
              ) : threadReady && thread ? (
                <>
                  <div className="p-4 border-b border-[var(--admin-border)] shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent-brand/20 flex items-center justify-center">
                        <User size={18} className="text-accent-brand" />
                      </div>
                      <div>
                        <p className="text-[10px] text-accent-brand uppercase tracking-wide mb-0.5">
                          Support chat {unreadChats > 0 ? "· unread" : ""}
                        </p>
                        <h2 className="font-semibold text-white">{thread.user.name}</h2>
                        <p className="text-sm text-[var(--admin-muted)]">{thread.user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                    {thread.messages.length === 0 ? (
                      <p className="text-sm text-[var(--admin-muted)]">No messages in this thread yet.</p>
                    ) : (
                      thread.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.role === "USER" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              m.role === "USER"
                                ? "bg-white/5 text-white border border-[var(--admin-border)] rounded-tl-sm"
                                : m.role === "SYSTEM"
                                  ? "bg-amber-500/10 text-amber-100/90 border border-amber-500/20 text-xs"
                                  : "bg-accent-brand/20 text-white border border-accent-brand/30 rounded-tr-sm"
                            }`}
                          >
                            {m.role === "ADMIN" && (
                              <p className="text-[10px] text-accent-brand mb-1 font-medium">
                                {m.adminName ?? "Support"} · Client Services
                              </p>
                            )}
                            <p className="whitespace-pre-wrap">{m.content}</p>
                            <p className="text-[10px] opacity-60 mt-1">
                              {new Date(m.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    className="p-4 border-t border-[var(--admin-border)] flex gap-2 shrink-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendReply();
                    }}
                  >
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply — the client will see it in their dashboard Support Chat…"
                      rows={2}
                      className="flex-1 rounded-xl border border-[var(--admin-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--admin-muted)] focus:border-accent-brand/50 focus:outline-none resize-none"
                      maxLength={4000}
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="admin-btn-primary h-auto px-4 flex items-center gap-2 shrink-0 self-end"
                    >
                      <Send size={16} />
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="p-6 text-[var(--admin-muted)]">Conversation unavailable.</p>
              )
            ) : null}
          </div>
        </div>
      </AdminFetchState>
    </div>
  );
}
