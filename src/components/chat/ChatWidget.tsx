"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Minimize2,
  Headphones,
  Info,
  Paperclip,
  ImageIcon,
  FileText,
  Files,
} from "lucide-react";
import type { ChatSuggestion } from "@/lib/chatbot";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { useChat } from "@/components/providers/ChatProvider";
import { getLocalizedWelcome } from "@/lib/i18n/chat-i18n";
import SupportChatAttachment, {
  type ChatAttachmentView,
} from "@/components/chat/SupportChatAttachment";
import {
  readFileAsSupportAttachment,
  supportAttachmentAccept,
  type SupportAttachmentKind,
  type ValidatedSupportAttachment,
} from "@/lib/support-attachment";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "admin" | "system";
  content: string;
  attachment?: ChatAttachmentView | null;
};

type ChatMode = "bot" | "human";

const STORAGE_KEY = "pcb-chat-messages";
const MODE_KEY = "pcb-chat-mode";
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 520;

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
}

function loadChatMode(): ChatMode {
  if (typeof window === "undefined") return "bot";
  try {
    const raw = sessionStorage.getItem(MODE_KEY);
    return raw === "human" ? "human" : "bot";
  } catch {
    return "bot";
  }
}

function saveChatMode(mode: ChatMode) {
  sessionStorage.setItem(MODE_KEY, mode);
}

export default function ChatWidget() {
  const { t } = useI18n();
  const { registerChat } = useChat();
  const pathname = usePathname();
  const router = useRouter();
  const welcome = getLocalizedWelcome(t);
  const isDashboard = pathname.startsWith("/dashboard");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [humanMessages, setHumanMessages] = useState<ChatMessage[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>("bot");
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanSending, setHumanSending] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>(welcome.suggestions ?? []);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<ValidatedSupportAttachment | null>(
    null
  );
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachKindRef = useRef<SupportAttachmentKind>("file");

  const isAdmin = pathname.startsWith("/admin");
  const hideLauncher = isAdmin || isDashboard;
  const openChatRef = useRef(() => {
    setOpen(true);
  });

  openChatRef.current = () => {
    if (isDashboard && isFrozen) {
      setChatMode("human");
      saveChatMode("human");
    }
    setOpen(true);
  };

  const openHumanRef = useRef(() => {
    setChatMode("human");
    if (isDashboard) saveChatMode("human");
    setOpen(true);
  });

  openHumanRef.current = () => {
    setChatMode("human");
    if (isDashboard) saveChatMode("human");
    setOpen(true);
    try {
      const prefill = sessionStorage.getItem("br-support-prefill");
      if (prefill) {
        sessionStorage.removeItem("br-support-prefill");
        setInput(prefill);
        window.setTimeout(() => inputRef.current?.focus(), 80);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    registerChat({
      open: () => openChatRef.current(),
      openHuman: () => openHumanRef.current(),
    });
  }, [registerChat, isFrozen, isDashboard]);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const wasDashboard = prevPathRef.current.startsWith("/dashboard");
    const nowDashboard = pathname.startsWith("/dashboard");
    prevPathRef.current = pathname;
    if (!wasDashboard && nowDashboard) setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDashboard) return;
    fetch("/api/dashboard/account-freeze", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setIsFrozen(!!data?.isFrozen);
      })
      .catch(() => {});
  }, [isDashboard, pathname]);

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      const w = getLocalizedWelcome(t);
      setMessages([{ id: "welcome", role: "bot", content: w.message }]);
      setSuggestions(w.suggestions ?? []);
    }
    if (isDashboard) {
      setChatMode(isFrozen ? "human" : loadChatMode());
    }
    setInitialized(true);
  }, [t, isDashboard, isFrozen]);

  useEffect(() => {
    if (isDashboard && isFrozen && chatMode !== "human") {
      setChatMode("human");
      saveChatMode("human");
    }
  }, [isDashboard, isFrozen, chatMode]);

  useEffect(() => {
    if (initialized && chatMode === "bot") saveMessages(messages);
  }, [messages, initialized, chatMode]);

  const mapHumanMessages = useCallback(
    (items: {
      id: string;
      role: string;
      content: string;
      attachment?: ChatAttachmentView | null;
    }[]): ChatMessage[] =>
      items.map((m) => ({
        id: m.id,
        content: m.content,
        role:
          m.role === "USER"
            ? "user"
            : m.role === "ADMIN"
              ? "admin"
              : m.role === "SYSTEM"
                ? "system"
                : "bot",
        attachment: m.attachment ?? null,
      })),
    []
  );

  const fetchHumanConversation = useCallback(async () => {
    if (!isDashboard) return;
    try {
      const res = await fetch("/api/dashboard/support-chat", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversation?.messages) {
        setHumanMessages(mapHumanMessages(data.conversation.messages));
      }
    } catch {
      /* polling should not break chat */
    }
  }, [isDashboard, mapHumanMessages]);

  useEffect(() => {
    if (!isDashboard || chatMode !== "human" || !open) return;
    setHumanLoading(true);
    fetchHumanConversation().finally(() => setHumanLoading(false));
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchHumanConversation();
    }, 12000);
    return () => window.clearInterval(id);
  }, [isDashboard, chatMode, open, fetchHumanConversation]);

  const switchMode = useCallback(
    (mode: ChatMode) => {
      if (isFrozen && mode === "bot") return;
      setChatMode(mode);
      if (isDashboard) saveChatMode(mode);
      setSuggestions(mode === "bot" ? getLocalizedWelcome(t).suggestions ?? [] : []);
    },
    [isDashboard, isFrozen, t]
  );

  const sendHumanMessage = useCallback(
    async (text: string, attachment?: ValidatedSupportAttachment | null) => {
      const trimmed = text.trim();
      if ((!trimmed && !attachment) || humanSending) return;

      setHumanSending(true);
      setInput("");
      setPendingAttachment(null);
      setAttachMenuOpen(false);
      setHumanMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed || (attachment ? attachment.name : ""),
          attachment: attachment
            ? {
                name: attachment.name,
                mime: attachment.mime,
                dataUrl: attachment.dataUrl,
                kind: attachment.kind,
              }
            : null,
        },
      ]);

      try {
        const res = await fetch("/api/dashboard/support-chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: trimmed,
            attachment: attachment
              ? {
                  name: attachment.name,
                  mime: attachment.mime,
                  dataUrl: attachment.dataUrl,
                }
              : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        if (data.conversation?.messages) {
          setHumanMessages(mapHumanMessages(data.conversation.messages));
        }
      } catch (err) {
        setHumanMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "system",
            content: err instanceof Error ? err.message : t("chat.humanSendError"),
          },
        ]);
      } finally {
        setHumanSending(false);
      }
    },
    [humanSending, mapHumanMessages, t]
  );

  const openAttachPicker = (kind: SupportAttachmentKind) => {
    attachKindRef.current = kind;
    setAttachMenuOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = supportAttachmentAccept(kind);
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onAttachmentSelected = async (file: File | null) => {
    if (!file) return;
    const result = await readFileAsSupportAttachment(file);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPendingAttachment(result.attachment);
  };

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, messages, humanMessages, typing, chatMode, humanLoading]);

  useEffect(() => {
    if (!isDashboard || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDashboard, open]);

  const addBotReply = useCallback(
    async (userText: string, priorMessages: ChatMessage[]) => {
      setTyping(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            pathname,
            recentMessages: priorMessages.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "bot", content: data.message },
        ]);
        setSuggestions(data.suggestions ?? []);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "bot",
            content: t("chat.connectionError"),
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [pathname, t]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (typing || humanSending) return;

      if (isDashboard && chatMode === "human") {
        if (!trimmed && !pendingAttachment) return;
        await sendHumanMessage(trimmed, pendingAttachment);
        return;
      }

      if (!trimmed) return;

      const displayText =
        trimmed === "contact_page" ? "I'd like to contact support" : trimmed;

      let historySnapshot: ChatMessage[] = [];
      setMessages((prev) => {
        historySnapshot = prev;
        return [...prev, { id: `user-${Date.now()}`, role: "user", content: displayText }];
      });
      setInput("");
      setSuggestions([]);

      if (trimmed === "contact_page") {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            content: t("chat.contactRedirect"),
          },
        ]);
        router.push("/contact");
        setSuggestions(getLocalizedWelcome(t).suggestions ?? []);
        return;
      }

      await addBotReply(trimmed, historySnapshot);
    },
    [
      addBotReply,
      typing,
      humanSending,
      router,
      t,
      isDashboard,
      chatMode,
      sendHumanMessage,
      pendingAttachment,
    ]
  );

  if (isAdmin) return null;
  if (isDashboard && !open) return null;

  const panelWidth = Math.min(window.innerWidth - 32, PANEL_WIDTH);
  const panelHeight = Math.min(window.innerHeight * 0.7, PANEL_HEIGHT);

  const activeMessages = isDashboard && chatMode === "human" ? humanMessages : messages;
  const isHumanMode = isDashboard && chatMode === "human";
  const inputDisabled = typing || humanSending || (isHumanMode && humanLoading);
  const showSuggestions = !isHumanMode && suggestions.length > 0 && !typing;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={
              isDashboard
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, y: 16, scale: 0.96 }
            }
            animate={
              isDashboard
                ? { opacity: 1, y: 0 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              isDashboard
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, y: 16, scale: 0.96 }
            }
            transition={{ duration: isDashboard ? 0.28 : 0.2, ease: isDashboard ? [0.32, 0.72, 0, 1] : undefined }}
            className={cn(
              "fixed z-[9999] flex flex-col bg-bg-elevated/95 backdrop-blur-xl overflow-hidden",
              isDashboard
                ? "inset-0 h-[100dvh] w-full safe-area-pb"
                : "rounded-2xl border border-border shadow-2xl shadow-black/20 right-4 sm:right-6 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] max-sm:left-4 max-sm:right-4"
            )}
            style={
              isDashboard
                ? undefined
                : {
                    width: panelWidth,
                    height: panelHeight,
                  }
            }
            role="dialog"
            aria-label={t("chat.ariaLabel")}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center gap-3 border-b border-white/10 brand-gradient-bg shrink-0",
                isDashboard
                  ? "px-4 py-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))]"
                  : "px-4 py-3"
              )}
            >
              <div
                className={cn(
                  "rounded-xl bg-white/15 flex items-center justify-center",
                  isDashboard ? "h-11 w-11" : "h-9 w-9"
                )}
              >
                {isHumanMode ? (
                  <Headphones size={isDashboard ? 20 : 18} className="text-white" />
                ) : (
                  <Bot size={isDashboard ? 20 : 18} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-white", isDashboard ? "text-base" : "text-sm")}>
                  {isDashboard ? t("nav.supportChat") : t("chat.assistantName")}
                </p>
                <p className="text-[10px] text-white/70 sm:text-xs">
                  {isHumanMode ? t("chat.humanStatus") : t("chat.onlineStatus")}
                </p>
              </div>
              {isDashboard ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
                  aria-label={t("common.close")}
                >
                  <X size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                  aria-label={t("chat.minimizeChat")}
                >
                  <Minimize2 size={16} />
                </button>
              )}
            </div>

            {isDashboard && !isFrozen && (
              <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.03] shrink-0">
                <div className="flex rounded-xl bg-white/10 p-1 max-w-3xl mx-auto">
                  <button
                    type="button"
                    onClick={() => switchMode("bot")}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                      chatMode === "bot"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-white/80 hover:text-white"
                    )}
                  >
                    {t("chat.modeBot")}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("human")}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                      chatMode === "human"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-white/80 hover:text-white"
                    )}
                  >
                    {t("chat.modeHuman")}
                  </button>
                </div>
              </div>
            )}

            {isHumanMode && (
              <div
                className={cn(
                  "shrink-0 border-b border-amber-500/20 bg-amber-500/10",
                  isDashboard ? "px-4 sm:px-6 py-3 max-w-3xl mx-auto w-full" : "px-4 py-3"
                )}
              >
                <div className="flex gap-2.5">
                  <Info size={16} className="text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-amber-100/90">{t("chat.humanSlaNotice")}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              ref={listRef}
              className={cn(
                "flex-1 overflow-y-auto space-y-3 scrollbar-hide",
                isDashboard ? "p-4 sm:p-6 max-w-3xl mx-auto w-full" : "p-4"
              )}
            >
              {isHumanMode && humanMessages.length === 0 && !humanLoading && (
                <div className="rounded-2xl border border-border bg-surface-overlay/60 px-4 py-3 text-sm text-text-secondary leading-relaxed">
                  {t("chat.humanEmptyState")}
                </div>
              )}

              {activeMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full shrink-0 flex items-center justify-center",
                      msg.role === "user"
                        ? "bg-accent-brand/20"
                        : msg.role === "admin"
                          ? "bg-emerald-500/20"
                          : msg.role === "system"
                            ? "bg-amber-500/15"
                            : "bg-surface-overlay"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User size={14} className="text-accent-brand" />
                    ) : msg.role === "admin" ? (
                      <Headphones size={14} className="text-emerald-400" />
                    ) : msg.role === "system" ? (
                      <Info size={14} className="text-amber-400" />
                    ) : (
                      <Bot size={14} className="text-white/80" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-accent-brand text-white rounded-tr-sm"
                        : msg.role === "admin"
                          ? "bg-emerald-500/15 text-text-primary border border-emerald-500/25 rounded-tl-sm"
                          : msg.role === "system"
                            ? "bg-amber-500/10 text-text-secondary border border-amber-500/20 rounded-tl-sm text-xs"
                            : "bg-surface-overlay text-text-secondary border border-border rounded-tl-sm"
                    )}
                  >
                    {msg.role === "admin" && (
                      <p className="text-[10px] font-medium text-emerald-400 mb-1">
                        {t("chat.supportSpecialist")}
                      </p>
                    )}
                    {msg.content &&
                      !(msg.attachment && msg.content === msg.attachment.name) && (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    {msg.attachment && (
                      <SupportChatAttachment
                        attachment={msg.attachment}
                        invert={msg.role === "user"}
                      />
                    )}
                  </div>
                </div>
              ))}

              {typing && !isHumanMode && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-surface-overlay flex items-center justify-center">
                    <Bot size={14} className="text-text-secondary" />
                  </div>
                  <div className="bg-surface-overlay border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-text-muted animate-pulse"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            {showSuggestions && (
              <div
                className={cn(
                  "flex flex-wrap gap-1.5 shrink-0",
                  isDashboard ? "px-4 sm:px-6 pb-2 max-w-3xl mx-auto w-full" : "px-3 pb-2"
                )}
              >
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => sendMessage(s.value)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-accent-brand/30 text-accent-brand hover:bg-accent-brand/10 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              className={cn(
                "border-t border-border flex flex-col gap-2 shrink-0 safe-area-pb",
                isDashboard ? "p-4 sm:p-6 max-w-3xl mx-auto w-full" : "p-3"
              )}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              {isHumanMode && pendingAttachment && (
                <div className="flex items-center gap-2 rounded-xl border border-accent-brand/25 bg-accent-brand/10 px-3 py-2">
                  <Paperclip size={14} className="text-accent-brand shrink-0" />
                  <span className="text-xs text-text-primary truncate flex-1">
                    {pendingAttachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    className="p-1 rounded-md text-text-muted hover:text-text-primary"
                    aria-label={t("common.close")}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex gap-2 relative">
                {isHumanMode && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => onAttachmentSelected(e.target.files?.[0] ?? null)}
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAttachMenuOpen((v) => !v)}
                        disabled={inputDisabled}
                        className="h-10 w-10 rounded-xl border border-border bg-surface-overlay flex items-center justify-center text-text-secondary hover:text-accent-brand hover:border-accent-brand/40 disabled:opacity-40 transition-colors"
                        aria-label={t("chat.attachFile")}
                      >
                        <Paperclip size={16} />
                      </button>
                      <AnimatePresence>
                        {attachMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            className="absolute bottom-12 left-0 z-20 w-48 rounded-xl border border-border bg-bg-secondary shadow-xl overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => openAttachPicker("image")}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-white/5"
                            >
                              <ImageIcon size={15} className="text-accent-brand" />
                              {t("chat.attachImage")}
                            </button>
                            <button
                              type="button"
                              onClick={() => openAttachPicker("document")}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-white/5"
                            >
                              <FileText size={15} className="text-accent-brand" />
                              {t("chat.attachDocument")}
                            </button>
                            <button
                              type="button"
                              onClick={() => openAttachPicker("file")}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary hover:bg-white/5"
                            >
                              <Files size={15} className="text-accent-brand" />
                              {t("chat.attachMore")}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isHumanMode ? t("chat.humanPlaceholder") : t("chat.placeholder")
                  }
                  className="flex-1 rounded-xl border border-border bg-surface-overlay px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-brand/50 focus:outline-none focus:ring-1 focus:ring-accent-brand/30"
                  maxLength={isHumanMode ? 2000 : 1000}
                  disabled={inputDisabled}
                />
                <button
                  type="submit"
                  disabled={
                    inputDisabled ||
                    (!input.trim() && !(isHumanMode && pendingAttachment))
                  }
                  className="h-10 w-10 rounded-xl brand-gradient-bg flex items-center justify-center text-white disabled:opacity-40 transition-opacity shadow-brand"
                  aria-label={t("chat.sendMessage")}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher — fixed bottom-right on marketing pages */}
      {!hideLauncher && (
        <div
          className={cn(
            "fixed z-[9999] right-4 sm:right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
            open && "pointer-events-none opacity-0"
          )}
          role="group"
        >
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="relative h-14 w-14 rounded-full brand-gradient-bg shadow-brand flex items-center justify-center text-white transition-transform hover:scale-105"
            aria-label={t("chat.ariaLabel")}
          >
            <MessageCircle size={22} />
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-bg-primary" />
          </button>
        </div>
      )}
    </>
  );
}
