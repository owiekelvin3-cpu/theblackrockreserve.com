"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import ChatWidget from "@/components/chat/ChatWidget";
import NotificationAudioUnlock from "@/components/providers/NotificationAudioUnlock";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <NotificationAudioUnlock />
      {children}
      <ChatWidget />
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
