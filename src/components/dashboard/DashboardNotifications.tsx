"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import UserDisplayName from "@/components/ui/UserDisplayName";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { getNotificationSoundVariant, isIncomingPaymentNotification } from "@/lib/notification-helpers";
import { parseMemberTransferNotificationTail } from "@/lib/transaction-counterparty";
import type { VerificationBadgeType } from "@/lib/verification-badge";
import {
  playNotificationSound,
  showBrowserNotification,
  ensureBrowserNotificationPermission,
  unlockNotificationAudio,
} from "@/lib/notification-sound";
import { useI18n } from "@/components/providers/I18nProvider";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  depositId?: string | null;
  createdAt: string;
  actorName?: string | null;
  actorVerificationBadge?: VerificationBadgeType | string | null;
};

function MemberTransferNotificationMessage({
  message,
  actorName,
  actorVerificationBadge,
}: {
  message: string;
  actorName: string;
  actorVerificationBadge?: VerificationBadgeType | string | null;
}) {
  const tail = parseMemberTransferNotificationTail(message, actorName);
  return (
    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
      <UserDisplayName
        name={actorName}
        verificationBadge={actorVerificationBadge}
        badgeSize="xs"
        nameClassName="font-semibold text-white"
        className="inline-flex max-w-[85%] align-middle"
      />
      <span className="text-text-secondary"> {tail}</span>
    </p>
  );
}

function showMemberTransferToast(n: Notification) {
  if (!n.actorName) {
    toast.info(n.title, { description: n.message, duration: 10_000 });
    return;
  }
  toast.info(n.title, {
    description: (
      <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
        <UserDisplayName
          name={n.actorName}
          verificationBadge={n.actorVerificationBadge}
          badgeSize="xs"
          nameClassName="font-semibold"
        />
        <span>{parseMemberTransferNotificationTail(n.message, n.actorName)}</span>
      </span>
    ),
    duration: 10_000,
  });
}

function notificationTypeLabel(type: string, t: (key: string) => string) {
  if (isIncomingPaymentNotification(type)) return t("notifications.creditPosted");
  if (type === "DEPOSIT_SUBMITTED") return t("notifications.pendingReview");
  if (type.includes("REJECTED")) return t("notifications.actionRequired");
  if (type === "WITHDRAWAL_APPROVED") return t("notifications.withdrawalSent");
  return null;
}

function showNotificationToast(n: Notification) {
  const opts = {
    description: n.message,
    duration: 10_000,
  } as const;

  if (n.type.includes("REJECTED")) {
    toast.error(n.title, opts);
    return;
  }
  if (isIncomingPaymentNotification(n.type)) {
    toast.success(n.title, opts);
    return;
  }
  if (n.type === "MEMBER_TRANSFER" && n.actorName) {
    showMemberTransferToast(n);
    return;
  }
  toast.info(n.title, opts);
}

export default function DashboardNotifications() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pushReadyRef = useRef(false);

  const alertNewItems = useCallback((fresh: Notification[]) => {
    if (fresh.length === 0) return;

    const variant = getNotificationSoundVariant(fresh[0].type);
    void playNotificationSound(variant);

    fresh.slice(0, 3).forEach((n) => {
      showNotificationToast(n);
      showBrowserNotification(n.title, n.message, n.id);
    });
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const { data, error: fetchError } = await fetchDashboardJson<{
        notifications: Notification[];
        unreadCount: number;
      }>("/api/dashboard/notifications");

      if (fetchError || !data) {
        setError(true);
        if (!silent) setLoading(false);
        return;
      }

      setError(false);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      if (pushReadyRef.current) {
        const fresh = data.notifications.filter((n) => !seenIdsRef.current.has(n.id) && !n.read);
        alertNewItems(fresh);
      }

      data.notifications.forEach((n) => seenIdsRef.current.add(n.id));
      pushReadyRef.current = true;
      if (!silent) setLoading(false);
    },
    [alertNewItems]
  );

  useEffect(() => {
    unlockNotificationAudio();
    void ensureBrowserNotificationPermission();
    load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, 45_000);
    const onRefresh = () => load(true);
    window.addEventListener("notifications:refresh", onRefresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications:refresh", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markRead = async (ids?: string[]) => {
    await fetch("/api/dashboard/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ids?.length ? { ids } : {}),
    });
    load(true);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-text-secondary hover:text-white hover:bg-bg-tertiary transition-colors"
        aria-label={t("notifications.title")}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full brand-gradient-bg text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="dash-notif-backdrop fixed inset-0 z-40 bg-black/50 sm:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="dash-notif-panel fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-[22rem] max-h-[min(75vh,28rem)] overflow-hidden rounded-2xl z-50 flex flex-col shadow-2xl">
            <div className="dash-notif-panel-head p-3.5 flex items-center justify-between gap-2 shrink-0">
              <p className="text-sm font-bold text-white">{t("notifications.title")}</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markRead()}
                  className="text-[11px] font-semibold text-accent-brand hover:text-white transition-colors"
                >
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <p className="p-4 text-sm text-text-muted">{t("common.loading")}</p>
          ) : error ? (
            <div className="p-4">
              <p className="text-sm text-accent-red">{t("notifications.loadError")}</p>
              <button type="button" onClick={() => load()} className="text-xs text-accent-brand mt-2">
                {t("withdrawals.retry")}
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">{t("notifications.empty")}</p>
          ) : (
            <ul className="divide-y divide-white/8">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "dash-notif-item p-3.5 cursor-pointer transition-colors",
                    !n.read && "dash-notif-item-unread"
                  )}
                  onClick={() => {
                    if (!n.read) markRead([n.id]);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white leading-snug">{n.title}</p>
                    {notificationTypeLabel(n.type, t) && (
                      <span
                        className={cn(
                          "shrink-0 text-[9px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full",
                          isIncomingPaymentNotification(n.type)
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35"
                            : "bg-accent-brand/15 text-accent-brand border border-accent-brand/30"
                        )}
                      >
                        {notificationTypeLabel(n.type, t)}
                      </span>
                    )}
                  </div>
                  {n.type === "MEMBER_TRANSFER" && n.actorName ? (
                    <MemberTransferNotificationMessage
                      message={n.message}
                      actorName={n.actorName}
                      actorVerificationBadge={n.actorVerificationBadge}
                    />
                  ) : (
                    <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{n.message}</p>
                  )}
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <p className="text-[10px] text-text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                    {n.depositId && (
                      <Link
                        href="/dashboard/deposit"
                        className="text-[10px] font-semibold text-accent-brand hover:text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View deposit →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
