"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import NotificationAudioUnlock from "@/components/providers/NotificationAudioUnlock";

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });

export default function Providers({ children }: { children: React.ReactNode }) {
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowChat(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <NotificationAudioUnlock />
      {children}
      {showChat && <ChatWidget />}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          },
        }}
      />
    </SessionProvider>
  );
}
