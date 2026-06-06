"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Minimize2 } from "lucide-react";
import { getWelcomeMessage, type ChatSuggestion } from "@/lib/chatbot";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
};

const STORAGE_KEY = "pcb-chat-messages";

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

export default function ChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>(
    getWelcomeMessage().suggestions ?? []
  );
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hidden = pathname.startsWith("/admin");

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      const welcome = getWelcomeMessage();
      setMessages([
        { id: "welcome", role: "bot", content: welcome.message },
      ]);
      setSuggestions(welcome.suggestions ?? []);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) saveMessages(messages);
  }, [messages, initialized]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, messages, typing]);

  const addBotReply = useCallback(async (userText: string) => {
    setTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
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
          content: "Sorry, I'm having trouble connecting. Please try again or visit our Contact page.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;

      const displayText =
        trimmed === "contact_page" ? "I'd like to contact support" : trimmed;

      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content: displayText },
      ]);
      setInput("");
      setSuggestions([]);

      if (trimmed === "contact_page") {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: "bot",
            content: "Taking you to our Contact page now—you can send a detailed message to our team.",
          },
        ]);
        router.push("/contact");
        setSuggestions(getWelcomeMessage().suggestions ?? []);
        return;
      }

      await addBotReply(trimmed);
    },
    [addBotReply, typing, router]
  );

  if (hidden) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 sm:right-6 z-[9999] flex flex-col w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] rounded-2xl border border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
            role="dialog"
            aria-label="Platinum Crest support chat"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 brand-gradient-bg shrink-0">
              <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Crest Assistant</p>
                <p className="text-[10px] text-white/70">Online · Platinum Crest Bank</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                aria-label="Minimize chat"
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full shrink-0 flex items-center justify-center",
                      msg.role === "user" ? "bg-accent-brand/20" : "bg-white/10"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User size={14} className="text-accent-brand" />
                    ) : (
                      <Bot size={14} className="text-white/80" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-accent-brand text-white rounded-tr-sm"
                        : "bg-white/5 text-text-secondary border border-white/10 rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center">
                    <Bot size={14} className="text-white/80" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
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
            {suggestions.length > 0 && !typing && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
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
              className="p-3 border-t border-white/10 flex gap-2 shrink-0"
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
                placeholder="Ask about accounts, deposits, KYC..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-accent-brand/50 focus:outline-none focus:ring-1 focus:ring-accent-brand/30"
                maxLength={1000}
                disabled={typing}
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="h-10 w-10 rounded-xl brand-gradient-bg flex items-center justify-center text-white disabled:opacity-40 transition-opacity shadow-brand"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-4 sm:right-6 z-[9999] h-14 w-14 rounded-full brand-gradient-bg shadow-brand flex items-center justify-center text-white transition-transform hover:scale-105",
          open && "scale-0 pointer-events-none"
        )}
        aria-label={open ? "Close chat" : "Open support chat"}
        whileTap={{ scale: 0.95 }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-bg-primary" />
        )}
      </motion.button>
    </>
  );
}
