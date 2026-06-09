"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Bitcoin } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useAdminNotifications } from "@/components/admin/AdminNotificationsProvider";
import {
  playNotificationSound,
  showBrowserNotification,
  ensureBrowserNotificationPermission,
  unlockNotificationAudio,
} from "@/lib/notification-sound";

export default function AdminTopBar() {
  const { data, lastUpdated } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevPendingRef = useRef<number | null>(null);
  const seenDepositIdsRef = useRef<Set<string>>(new Set());
  const pushReadyRef = useRef(false);

  useEffect(() => {
    unlockNotificationAudio();
    void ensureBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    const pending = data?.pendingDeposits ?? 0;
    const alerts = data?.recentDepositAlerts ?? [];

    if (pushReadyRef.current && pending > (prevPendingRef.current ?? 0)) {
      const fresh = alerts.filter((a) => !seenDepositIdsRef.current.has(a.id));
      if (fresh.length > 0) {
        void playNotificationSound("alert");
        const latest = fresh[0];
        toast("New deposit request", {
          description: `${latest.userName} · ${latest.amountUsd != null ? formatCurrency(latest.amountUsd) : "Amount not specified"}`,
          duration: 8000,
        });
        showBrowserNotification(
          "New Bitcoin deposit request",
          `${latest.userName} submitted a deposit for review.`,
          latest.id
        );
      }
    }

    alerts.forEach((a) => seenDepositIdsRef.current.add(a.id));
    prevPendingRef.current = pending;
    pushReadyRef.current = true;
  }, [data]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const alerts = data?.recentDepositAlerts ?? [];
  const total = data?.totalAlerts ?? 0;

  return (
    <div className="sticky top-0 z-30 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mb-6 border-b border-white/5 bg-[var(--admin-bg)]/80 backdrop-blur-md flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs text-[var(--admin-muted)]">Live sync · alerts every 45s</span>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-[10px] text-[var(--admin-muted)] hidden sm:inline">
            Last sync {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-lg border border-white/10 hover:bg-white/5 text-[var(--admin-muted)] hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--admin-accent)] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {total > 99 ? "99+" : total}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-[360px] max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-[var(--admin-card)] shadow-2xl">
              <div className="p-4 border-b border-white/10">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="text-[10px] text-[var(--admin-muted)] mt-0.5">
                  {data?.pendingDeposits ?? 0} pending deposit{(data?.pendingDeposits ?? 0) === 1 ? "" : "s"}
                </p>
              </div>

              {alerts.length === 0 ? (
                <p className="p-4 text-sm text-[var(--admin-muted)]">No pending deposit alerts</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {alerts.map((a) => (
                    <li key={a.id} className="p-4 hover:bg-white/[0.02]">
                      <div className="flex items-start gap-3">
                        <Bitcoin size={16} className="text-[var(--admin-accent)] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">New deposit request</p>
                          <p className="text-xs text-[var(--admin-muted)] mt-1">
                            <strong className="text-white/80">{a.userName}</strong> · ID: {a.userId.slice(0, 12)}…
                          </p>
                          <p className="text-xs text-[var(--admin-muted)]">
                            Amount: {a.amountUsd != null ? formatCurrency(a.amountUsd) : "Not specified"}
                          </p>
                          {a.txHash && (
                            <p className="text-[10px] font-mono text-[var(--admin-muted)] truncate">TX: {a.txHash}</p>
                          )}
                          <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                            {new Date(a.createdAt).toLocaleString()} · {a.status}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="p-3 border-t border-white/10">
                <Link
                  href="/admin/deposits"
                  className="block text-center text-xs admin-link py-2"
                  onClick={() => setOpen(false)}
                >
                  Open Deposit Management →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
