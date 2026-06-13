"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Skeleton from "@/components/ui/Skeleton";
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatInboxTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (date >= startOfYesterday) {
    return "Yesterday";
  }
  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function AdminMessagesPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<MessagesPayload>(
    "/api/admin/messages",
    { pollMs: 30_000 }
  );
  const [selection, setSelection] = useState<Selection>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [search, setSearch] = useState("");
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

  const filteredInbox = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((item) => {
      if (item.kind === "chat") {
        const c = item.row;
        return (
          c.userName.toLowerCase().includes(q) ||
          c.userEmail.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
        );
      }
      const m = item.row;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
      );
    });
  }, [inbox, search]);

  const selectedContact = useMemo(
    () =>
      selection?.kind === "contact"
        ? contacts.find((m) => m.id === selection.id) ?? null
        : null,
    [selection, contacts]
  );

  const unreadChats = conversations.filter((c) => c.adminUnread).length;

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

  const selectItem = (item: InboxItem) => {
    setSelection({ kind: item.kind, id: item.id });
    setMobileShowChat(true);
  };

  const backToList = () => {
    setMobileShowChat(false);
  };

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
        setMobileShowChat(false);
      }
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const threadReady = selection?.kind === "chat" && thread?.id === selection.id;
  const sidebarClass = mobileShowChat ? "admin-wa-sidebar admin-wa-sidebar-hidden" : "admin-wa-sidebar";
  const chatClass = mobileShowChat ? "admin-wa-chat admin-wa-chat-open" : "admin-wa-chat";

  return (
    <div>
      <AdminFetchState
        loading={loading}
        error={error}
        onRetry={refresh}
        lastUpdated={lastUpdated}
        isEmpty={!loading && !error && inbox.length === 0}
        emptyMessage="No messages yet. Support chats appear when clients use Human Support; contact form submissions appear here too."
      >
        <div className="admin-wa-shell">
          {/* Inbox sidebar — WhatsApp chat list */}
          <aside className={sidebarClass}>
            <div className="admin-wa-sidebar-head">
              <h2>Messages</h2>
              <button
                type="button"
                onClick={refresh}
                className="admin-wa-icon-btn"
                aria-label="Refresh inbox"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="admin-wa-search-wrap">
              <label className="admin-wa-search">
                <Search size={16} className="text-[var(--admin-muted)] shrink-0" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search or filter messages"
                  aria-label="Search messages"
                />
              </label>
            </div>

            <div className="admin-wa-inbox">
              {filteredInbox.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--admin-muted)] text-center">
                  No messages match your search.
                </p>
              ) : (
                filteredInbox.map((item) => {
                  const active =
                    selection?.kind === item.kind && selection.id === item.id;

                  if (item.kind === "chat") {
                    const c = item.row;
                    return (
                      <button
                        key={`chat-${c.id}`}
                        type="button"
                        onClick={() => selectItem(item)}
                        className={`admin-wa-inbox-item ${active ? "admin-wa-inbox-item-active" : ""}`}
                      >
                        <div className="admin-wa-avatar admin-wa-avatar-chat">
                          {getInitials(c.userName)}
                        </div>
                        <div className="admin-wa-inbox-body">
                          <div className="admin-wa-inbox-top">
                            <span className="admin-wa-inbox-name">{c.userName}</span>
                            <span className="admin-wa-inbox-time">
                              {formatInboxTime(c.lastMessageAt)}
                            </span>
                          </div>
                          <div className="admin-wa-inbox-preview">
                            <span className="admin-wa-inbox-snippet">{c.lastMessage}</span>
                            {c.adminUnread && (
                              <span className="admin-wa-unread-badge" aria-label="Unread">
                                1
                              </span>
                            )}
                          </div>
                          <p className="admin-wa-type-tag">Support chat</p>
                        </div>
                      </button>
                    );
                  }

                  const m = item.row;
                  return (
                    <button
                      key={`contact-${m.id}`}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`admin-wa-inbox-item ${active ? "admin-wa-inbox-item-active" : ""}`}
                    >
                      <div className="admin-wa-avatar admin-wa-avatar-contact">
                        {getInitials(m.name)}
                      </div>
                      <div className="admin-wa-inbox-body">
                        <div className="admin-wa-inbox-top">
                          <span className="admin-wa-inbox-name">{m.name}</span>
                          <span className="admin-wa-inbox-time">
                            {formatInboxTime(m.createdAt)}
                          </span>
                        </div>
                        <div className="admin-wa-inbox-preview">
                          <span className="admin-wa-inbox-snippet">{m.subject}</span>
                        </div>
                        <p className="admin-wa-type-tag">Contact form</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Conversation panel — WhatsApp thread view */}
          <section className={chatClass}>
            {!selection ? (
              <div className="admin-wa-empty">
                <div className="admin-wa-empty-icon">
                  <MessageSquare size={32} />
                </div>
                <p className="text-sm font-medium text-[var(--admin-text)]">
                  Select a conversation
                </p>
                <p className="text-xs max-w-xs">
                  Support chats and contact form messages appear in the inbox on the left.
                </p>
              </div>
            ) : selection.kind === "contact" && selectedContact ? (
              <>
                <header className="admin-wa-chat-head">
                  <button
                    type="button"
                    onClick={backToList}
                    className="admin-wa-icon-btn lg:hidden"
                    aria-label="Back to inbox"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="admin-wa-avatar admin-wa-avatar-contact">
                    {getInitials(selectedContact.name)}
                  </div>
                  <div className="admin-wa-chat-head-info">
                    <p className="admin-wa-chat-head-name">{selectedContact.name}</p>
                    <p className="admin-wa-chat-head-sub">
                      {selectedContact.email} · Contact form
                    </p>
                  </div>
                </header>

                <div ref={threadRef} className="admin-wa-thread">
                  <div className="admin-wa-date-pill">
                    <span>{formatDayLabel(selectedContact.createdAt)}</span>
                  </div>
                  <div className="admin-wa-bubble-row admin-wa-bubble-row-in">
                    <div className="admin-wa-bubble admin-wa-bubble-in">
                      <p className="admin-wa-bubble-sender">{selectedContact.subject}</p>
                      <p className="admin-wa-bubble-text">{selectedContact.message}</p>
                      <div className="admin-wa-bubble-meta">
                        <span>{formatBubbleTime(selectedContact.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="admin-wa-bubble-row admin-wa-bubble-row-system">
                    <div className="admin-wa-bubble admin-wa-bubble-system">
                      Reply to this client at {selectedContact.email} or respond in Support Chat
                      if they have a dashboard account.
                    </div>
                  </div>
                </div>

                <div className="admin-wa-contact-actions">
                  <button
                    type="button"
                    onClick={() => deleteContact(selectedContact.id)}
                    disabled={deleting === selectedContact.id}
                    className="admin-wa-delete-btn"
                  >
                    <Trash2 size={15} />
                    {deleting === selectedContact.id ? "Deleting…" : "Delete message"}
                  </button>
                </div>
              </>
            ) : selection.kind === "chat" ? (
              threadLoading && !threadReady ? (
                <div className="p-6 space-y-3 flex-1">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-16 w-3/4 rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg ml-auto" />
                </div>
              ) : threadError ? (
                <div className="admin-wa-empty">
                  <p className="text-sm font-medium text-[var(--admin-text)]">
                    Could not load this conversation
                  </p>
                  <p className="text-xs">{threadError}</p>
                  <button
                    type="button"
                    onClick={() => loadThread(selection.id)}
                    className="admin-btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Try again
                  </button>
                </div>
              ) : threadReady && thread ? (
                <>
                  <header className="admin-wa-chat-head">
                    <button
                      type="button"
                      onClick={backToList}
                      className="admin-wa-icon-btn lg:hidden"
                      aria-label="Back to inbox"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="admin-wa-avatar admin-wa-avatar-chat">
                      {getInitials(thread.user.name)}
                    </div>
                    <div className="admin-wa-chat-head-info">
                      <p className="admin-wa-chat-head-name">{thread.user.name}</p>
                      <p className="admin-wa-chat-head-sub">
                        {thread.user.email}
                        {unreadChats > 0 ? " · unread in inbox" : ""}
                      </p>
                    </div>
                  </header>

                  <div ref={threadRef} className="admin-wa-thread">
                    {thread.messages.length === 0 ? (
                      <p className="text-sm text-[var(--admin-muted)] text-center py-8">
                        No messages in this thread yet.
                      </p>
                    ) : (
                      thread.messages.map((m, i) => {
                        const showDate =
                          i === 0 || !sameDay(m.createdAt, thread.messages[i - 1].createdAt);
                        const isUser = m.role === "USER";
                        const isSystem = m.role === "SYSTEM";

                        return (
                          <div key={m.id}>
                            {showDate && (
                              <div className="admin-wa-date-pill">
                                <span>{formatDayLabel(m.createdAt)}</span>
                              </div>
                            )}
                            <div
                              className={`admin-wa-bubble-row ${
                                isSystem
                                  ? "admin-wa-bubble-row-system"
                                  : isUser
                                    ? "admin-wa-bubble-row-in"
                                    : "admin-wa-bubble-row-out"
                              }`}
                            >
                              <div
                                className={`admin-wa-bubble ${
                                  isSystem
                                    ? "admin-wa-bubble-system"
                                    : isUser
                                      ? "admin-wa-bubble-in"
                                      : "admin-wa-bubble-out"
                                }`}
                              >
                                {m.role === "ADMIN" && (
                                  <p className="admin-wa-bubble-sender">
                                    {m.adminName ?? "Support"} · Client Services
                                  </p>
                                )}
                                <p className="admin-wa-bubble-text">{m.content}</p>
                                {!isSystem && (
                                  <div className="admin-wa-bubble-meta">
                                    <span>{formatBubbleTime(m.createdAt)}</span>
                                    {m.role === "ADMIN" && (
                                      <CheckCheck size={12} className="text-[var(--admin-accent)]" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form
                    className="admin-wa-compose"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendReply();
                    }}
                  >
                    <div className="admin-wa-compose-input-wrap">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Type a message"
                        rows={1}
                        maxLength={4000}
                        disabled={sending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!reply.trim() || sending}
                      className="admin-wa-send-btn"
                      aria-label={sending ? "Sending" : "Send message"}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="admin-wa-empty">
                  <p className="text-sm">Conversation unavailable.</p>
                </div>
              )
            ) : null}
          </section>
        </div>
      </AdminFetchState>
    </div>
  );
}
