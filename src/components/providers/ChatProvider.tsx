"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });

type ChatActions = {
  open: () => void;
};

type ChatContextValue = {
  openChat: () => void;
  registerChat: (actions: ChatActions) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const actionsRef = useRef<ChatActions | null>(null);
  const pendingOpenRef = useRef(false);
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    if (isDashboard) return;
    const timer = window.setTimeout(() => setShowWidget(true), 1500);
    return () => window.clearTimeout(timer);
  }, [isDashboard]);

  const registerChat = useCallback((actions: ChatActions) => {
    actionsRef.current = actions;
    if (pendingOpenRef.current) {
      pendingOpenRef.current = false;
      actions.open();
    }
  }, []);

  const openChat = useCallback(() => {
    setShowWidget(true);
    if (actionsRef.current) {
      actionsRef.current.open();
    } else {
      pendingOpenRef.current = true;
    }
  }, []);

  return (
    <ChatContext.Provider value={{ openChat, registerChat }}>
      {children}
      {showWidget && <ChatWidget />}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  return {
    openChat: ctx?.openChat ?? (() => {}),
    registerChat: ctx?.registerChat ?? (() => {}),
  };
}
