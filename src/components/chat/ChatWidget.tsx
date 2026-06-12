"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Minimize2, Headphones, Info } from "lucide-react";
import type { ChatSuggestion } from "@/lib/chatbot";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { useChat } from "@/components/providers/ChatProvider";
import { getLocalizedWelcome } from "@/lib/i18n/chat-i18n";

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "admin" | "system";
  content: string;
};

type ChatMode = "bot" | "human";

type LauncherPosition = { x: number; y: number };

const STORAGE_KEY = "pcb-chat-messages";
const MODE_KEY = "pcb-chat-mode";
const POSITION_KEY = "pcb-chat-position";
const LAUNCHER_SIZE = 56;
const DRAG_THRESHOLD = 8;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 520;
const VIEWPORT_MARGIN = 8;

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

function readStoredPosition(): LauncherPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LauncherPosition;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePosition(position: LauncherPosition) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    /* ignore */
  }
}

function getDashboardBottomGap(): number {
  if (typeof window === "undefined") return 84;
  return window.matchMedia("(min-width: 640px)").matches ? 24 : 84;
}

function getDefaultPosition(isDashboard: boolean): LauncherPosition {
  const margin = 16;
  const bottomGap = isDashboard ? getDashboardBottomGap() : 24;
  return {
    x: window.innerWidth - LAUNCHER_SIZE - margin,
    y: window.innerHeight - LAUNCHER_SIZE - bottomGap,
  };
}

function clampPosition(position: LauncherPosition): LauncherPosition {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - LAUNCHER_SIZE - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - LAUNCHER_SIZE - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(position.x, VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(position.y, VIEWPORT_MARGIN), maxY),
  };
}

function computePanelPosition(launcher: LauncherPosition, panelW: number, panelH: number) {
  let left = launcher.x + LAUNCHER_SIZE - panelW;
  let top = launcher.y - panelH - 12;

  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
  if (left + panelW > window.innerWidth - VIEWPORT_MARGIN) {
    left = window.innerWidth - panelW - VIEWPORT_MARGIN;
  }

  if (top < VIEWPORT_MARGIN) {
    top = launcher.y + LAUNCHER_SIZE + 12;
  }
  if (top + panelH > window.innerHeight - VIEWPORT_MARGIN) {
    top = window.innerHeight - panelH - VIEWPORT_MARGIN;
  }

  return { left, top };
}

export default function ChatWidget() {
  const { t } = useI18n();
  const { registerChat } = useChat();
  const pathname = usePathname();
  const router = useRouter();
  const welcome = getLocalizedWelcome(t);
  const isDashboard = pathname.startsWith("/dashboard");
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState<LauncherPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [humanMessages, setHumanMessages] = useState<ChatMessage[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>("bot");
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanSending, setHumanSending] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>(welcome.suggestions ?? []);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<LauncherPosition | null>(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const isAdmin = pathname.startsWith("/admin");
  const hideLauncher = isAdmin || isDashboard;
  const openChatRef = useRef(() => {
    setDismissed(false);
    setOpen(true);
  });

  openChatRef.current = () => {
    setDismissed(false);
    setOpen(true);
  };

  useEffect(() => {
    registerChat({
      open: () => openChatRef.current(),
    });
  }, [registerChat]);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const wasDashboard = prevPathRef.current.startsWith("/dashboard");
    const nowDashboard = pathname.startsWith("/dashboard");
    prevPathRef.current = pathname;
    if (!wasDashboard && nowDashboard) setOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.removeItem("pcb-chat-dismissed");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const stored = readStoredPosition();
    const initial = clampPosition(stored ?? getDefaultPosition(isDashboard));
    positionRef.current = initial;
    setPosition(initial);
  }, [isDashboard]);

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => {
        if (!current) return current;
        const next = clampPosition(current);
        positionRef.current = next;
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dismissChat = useCallback(() => {
    setOpen(false);
    setDismissed(true);
  }, []);

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      const w = getLocalizedWelcome(t);
      setMessages([{ id: "welcome", role: "bot", content: w.message }]);
      setSuggestions(w.suggestions ?? []);
    }
    if (isDashboard) setChatMode(loadChatMode());
    setInitialized(true);
  }, [t, isDashboard]);

  useEffect(() => {
    if (initialized && chatMode === "bot") saveMessages(messages);
  }, [messages, initialized, chatMode]);

  const mapHumanMessages = useCallback(
    (items: { id: string; role: string; content: string }[]): ChatMessage[] =>
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
      setChatMode(mode);
      if (isDashboard) saveChatMode(mode);
      setSuggestions(mode === "bot" ? getLocalizedWelcome(t).suggestions ?? [] : []);
    },
    [isDashboard, t]
  );

  const sendHumanMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || humanSending) return;

      setHumanSending(true);
      setInput("");
      setHumanMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: trimmed },
      ]);

      try {
        const res = await fetch("/api/dashboard/support-chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        if (data.conversation?.messages) {
          setHumanMessages(mapHumanMessages(data.conversation.messages));
        }
      } catch {
        setHumanMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "system", content: t("chat.humanSendError") },
        ]);
      } finally {
        setHumanSending(false);
      }
    },
    [humanSending, mapHumanMessages, t]
  );

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
      if (!trimmed || typing || humanSending) return;

      if (isDashboard && chatMode === "human") {
        await sendHumanMessage(trimmed);
        return;
      }

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
    [addBotReply, typing, humanSending, router, t, isDashboard, chatMode, sendHumanMessage]
  );

  const handleLauncherPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !position) return;
    const rect = launcherRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [position]);

  const handleLauncherPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active || !position) return;

    const deltaX = Math.abs(event.clientX - dragState.current.startX);
    const deltaY = Math.abs(event.clientY - dragState.current.startY);
    if (!dragState.current.moved && deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD) {
      return;
    }

    dragState.current.moved = true;
    setDragging(true);
    const next = clampPosition({
      x: event.clientX - dragState.current.offsetX,
      y: event.clientY - dragState.current.offsetY,
    });
    positionRef.current = next;
    setPosition(next);
  }, [position]);

  const finishLauncherPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current.active) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const wasDrag = dragState.current.moved;
      if (wasDrag && positionRef.current) {
        savePosition(positionRef.current);
      } else if (!wasDrag) {
        setOpen((value) => !value);
      }

      dragState.current.active = false;
      dragState.current.moved = false;
      setDragging(false);
    },
    []
  );

  if (isAdmin) return null;
  if (isDashboard && !open) return null;
  if (!isDashboard && (dismissed || !position)) return null;

  const panelWidth = Math.min(window.innerWidth - 32, PANEL_WIDTH);
  const panelHeight = Math.min(window.innerHeight * 0.7, PANEL_HEIGHT);
  const panelPosition = position
    ? computePanelPosition(position, panelWidth, panelHeight)
    : { left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN };

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
                : "rounded-2xl border border-border shadow-2xl shadow-black/20"
            )}
            style={
              isDashboard
                ? undefined
                : {
                    left: panelPosition.left,
                    top: panelPosition.top,
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
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                    aria-label={t("chat.minimizeChat")}
                  >
                    <Minimize2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={dismissChat}
                    className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                    aria-label={t("chat.dismissChat")}
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>

            {isDashboard && (
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
                    {msg.content}
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
                "border-t border-border flex gap-2 shrink-0 safe-area-pb",
                isDashboard ? "p-4 sm:p-6 max-w-3xl mx-auto w-full" : "p-3"
              )}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
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
                disabled={!input.trim() || inputDisabled}
                className="h-10 w-10 rounded-xl brand-gradient-bg flex items-center justify-center text-white disabled:opacity-40 transition-opacity shadow-brand"
                aria-label={t("chat.sendMessage")}
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher — hidden on dashboard and admin */}
      {!hideLauncher && position && (
        <div
          ref={launcherRef}
          className={cn(
            "fixed z-[9999] touch-none select-none",
            dragging ? "cursor-grabbing" : "cursor-grab",
            open && "pointer-events-none opacity-0"
          )}
          style={{ left: position.x, top: position.y, width: LAUNCHER_SIZE, height: LAUNCHER_SIZE }}
          onPointerDown={handleLauncherPointerDown}
          onPointerMove={handleLauncherPointerMove}
          onPointerUp={finishLauncherPointer}
          onPointerCancel={finishLauncherPointer}
          aria-label={t("chat.dragChat")}
          role="group"
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              dismissChat();
            }}
            className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-secondary shadow-md transition-colors hover:bg-surface-overlay hover:text-text-primary"
            aria-label={t("chat.removeChatIcon")}
          >
            <X size={11} />
          </button>

          <div
            className={cn(
              "relative h-14 w-14 rounded-full brand-gradient-bg shadow-brand flex items-center justify-center text-white transition-transform",
              !dragging && "hover:scale-105"
            )}
          >
            <MessageCircle size={22} />
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-bg-primary" />
          </div>
        </div>
      )}
    </>
  );
}
