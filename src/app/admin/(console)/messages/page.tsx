"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mail, MessageSquare, Send, Trash2, User } from "lucide-react";
import { toast } from "sonner";
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

type Tab = "chat" | "contact";

export default function AdminMessagesPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{
    messages: ContactRow[];
    conversations: ConversationRow[];
  }>("/api/admin/messages");
  const [tab, setTab] = useState<Tab>("chat");
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationDetail | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const contacts = useMemo(() => data?.messages ?? [], [data?.messages]);
  const conversations = useMemo(() => data?.conversations ?? [], [data?.conversations]);

  useEffect(() => {
    if (contacts.length === 0) {
      setSelectedContact(null);
      return;
    }
    if (!selectedContact || !contacts.some((m) => m.id === selectedContact.id)) {
      setSelectedContact(contacts[0]);
    }
  }, [contacts, selectedContact]);

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedChatId(null);
      setThread(null);
      return;
    }
    if (!selectedChatId || !conversations.some((c) => c.id === selectedChatId)) {
      setSelectedChatId(conversations[0].id);
    }
  }, [conversations, selectedChatId]);

  const loadThread = useCallback(async (id: string) => {
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/admin/messages/conversations/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load conversation");
      setThread(json.conversation);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load conversation");
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (tab !== "chat" || !selectedChatId) return;
    loadThread(selectedChatId);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") loadThread(selectedChatId);
    }, 15000);
    return () => window.clearInterval(id);
  }, [tab, selectedChatId, loadThread]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages, threadLoading]);

  const sendReply = async () => {
    if (!selectedChatId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/messages/conversations/${selectedChatId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send reply");
      setThread(json.conversation);
      setReply("");
      toast.success("Reply sent");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const deleteContact = async (id: string) => {
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

  const unreadChats = conversations.filter((c) => c.adminUnread).length;

  return (
    <div>
      <AdminPageHeader
        title="Messages"
        description="Live support chats from the dashboard and contact form submissions — auto-refreshes every 30s"
        action={
          <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
            Refresh
          </button>
        }
      />

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`admin-btn-ghost text-xs px-4 py-2 flex items-center gap-2 ${
            tab === "chat" ? "bg-accent-brand/15 text-accent-brand border-accent-brand/30" : ""
          }`}
        >
          <MessageSquare size={14} />
          Support Chat
          {unreadChats > 0 && (
            <span className="ml-1 rounded-full bg-accent-brand px-1.5 py-0.5 text-[10px] text-white">
              {unreadChats}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("contact")}
          className={`admin-btn-ghost text-xs px-4 py-2 flex items-center gap-2 ${
            tab === "contact" ? "bg-accent-brand/15 text-accent-brand border-accent-brand/30" : ""
          }`}
        >
          <Mail size={14} />
          Contact Form
          {contacts.length > 0 && (
            <span className="ml-1 text-[10px] text-[var(--admin-muted)]">{contacts.length}</span>
          )}
        </button>
      </div>

      <AdminFetchState
        loading={loading}
        error={error}
        onRetry={refresh}
        lastUpdated={lastUpdated}
        isEmpty={
          !loading &&
          !error &&
          (tab === "chat" ? conversations.length === 0 : contacts.length === 0)
        }
        emptyMessage={
          tab === "chat"
            ? "No support chat conversations yet"
            : "No contact form messages in the database"
        }
      >
        {tab === "chat" ? (
          <div className="grid lg:grid-cols-5 gap-4 h-[calc(100vh-280px)] min-h-[420px]">
            <div className="lg:col-span-2 admin-card overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChatId(c.id)}
                  className={`w-full text-left p-4 border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02] transition-colors ${
                    selectedChatId === c.id ? "bg-accent-brand/10 border-l-2 border-l-accent-brand" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{c.userName}</p>
                    {c.adminUnread && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-accent-brand" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--admin-muted)] mt-0.5 truncate">{c.userEmail}</p>
                  <p className="text-xs text-[var(--admin-muted)] mt-2 line-clamp-2">{c.lastMessage}</p>
                  <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                    {new Date(c.lastMessageAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-3 admin-card flex flex-col min-h-0">
              {selectedChatId && thread ? (
                <>
                  <div className="p-4 border-b border-[var(--admin-border)] shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent-brand/20 flex items-center justify-center">
                        <User size={18} className="text-accent-brand" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-white">{thread.user.name}</h2>
                        <p className="text-sm text-[var(--admin-muted)]">{thread.user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                    {threadLoading && thread.messages.length === 0 ? (
                      <p className="text-sm text-[var(--admin-muted)]">Loading conversation…</p>
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
                            {m.role === "ADMIN" && m.adminName && (
                              <p className="text-[10px] text-accent-brand mb-1 font-medium">
                                {m.adminName} · Support
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
                      placeholder="Type your reply to the client…"
                      rows={2}
                      className="flex-1 rounded-xl border border-[var(--admin-border)] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--admin-muted)] focus:border-accent-brand/50 focus:outline-none resize-none"
                      maxLength={4000}
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="admin-btn-primary h-auto px-4 flex items-center gap-2 shrink-0"
                    >
                      <Send size={16} />
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <p className="p-6 text-[var(--admin-muted)]">Select a support conversation</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-4 h-[calc(100vh-280px)] min-h-[400px]">
            <div className="lg:col-span-2 admin-card overflow-y-auto">
              {contacts.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedContact(m)}
                  className={`w-full text-left p-4 border-b border-[var(--admin-border)]/50 hover:bg-white/[0.02] transition-colors ${
                    selectedContact?.id === m.id ? "bg-accent-brand/10 border-l-2 border-l-accent-brand" : ""
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
              {selectedContact ? (
                <>
                  <div className="flex items-start justify-between gap-3 mb-6 pb-4 border-b border-[var(--admin-border)]">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent-brand/20 flex items-center justify-center">
                        <Mail size={18} className="text-accent-brand" />
                      </div>
                      <div>
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
                </>
              ) : (
                <p className="text-[var(--admin-muted)]">Select a message</p>
              )}
            </div>
          </div>
        )}
      </AdminFetchState>
    </div>
  );
}
