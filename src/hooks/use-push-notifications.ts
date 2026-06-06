"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  playNotificationSound,
  showBrowserNotification,
  ensureBrowserNotificationPermission,
} from "@/lib/notification-sound";
import { getNotificationSoundVariant } from "@/lib/notification-helpers";

export type PushNotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string;
  createdAt: string;
};

type UsePushNotificationsOptions = {
  enabled?: boolean;
  pollMs?: number;
  soundVariant?: "default" | "success" | "alert";
  onNew?: (items: PushNotificationItem[]) => void;
};

/** Poll an endpoint and fire toast + sound when new items arrive */
export function usePushNotifications<T extends { notifications?: PushNotificationItem[] }>(
  url: string,
  options: UsePushNotificationsOptions = {}
) {
  const { enabled = true, pollMs = 20_000, soundVariant = "default", onNew } = options;
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    void ensureBrowserNotificationPermission();

    const load = async (silent: boolean) => {
      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as T;
        const items = data.notifications ?? [];

        if (!initializedRef.current) {
          items.forEach((n) => seenIdsRef.current.add(n.id));
          initializedRef.current = true;
          return;
        }

        const fresh = items.filter((n) => !seenIdsRef.current.has(n.id));
        if (fresh.length === 0) return;

        fresh.forEach((n) => seenIdsRef.current.add(n.id));

        if (!silent) {
          const variant = fresh[0].type
            ? getNotificationSoundVariant(fresh[0].type)
            : soundVariant;
          void playNotificationSound(variant);
        }

        fresh.slice(0, 3).forEach((n) => {
          toast(n.title, { description: n.message, duration: 6000 });
          showBrowserNotification(n.title, n.message, n.id);
        });

        onNew?.(fresh);
      } catch {
        /* polling should not break the UI */
      }
    };

    load(false);
    const tick = () => {
      if (document.visibilityState === "visible") load(true);
    };
    const interval = window.setInterval(tick, pollMs);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);

    const onRefresh = () => load(true);
    window.addEventListener("notifications:refresh", onRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("notifications:refresh", onRefresh);
    };
  }, [enabled, url, pollMs, soundVariant, onNew]);
}

export function dispatchNotificationsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:refresh"));
  }
}
