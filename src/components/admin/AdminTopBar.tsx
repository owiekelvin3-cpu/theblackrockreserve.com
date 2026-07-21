"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Bitcoin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  useAdminNotifications,
  type AdminNotificationData,
} from "@/components/admin/AdminNotificationsProvider";
import {
  playNotificationSound,
  showBrowserNotification,
  ensureBrowserNotificationPermission,
  unlockNotificationAudio,
} from "@/lib/notification-sound";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSelector from "@/components/ui/LanguageSelector";
import AdminGlobalSearch from "@/components/admin/AdminGlobalSearch";
import { useI18n } from "@/components/providers/I18nProvider";

type AlertCountKey =
  | "unreadSupportChats"
  | "pendingDeposits"
  | "pendingWithdrawals"
  | "pendingWithdrawalCharges"
  | "pendingProfitTaxPayments"
  | "pendingKyc"
  | "pendingLoans"
  | "pendingCardRequests"
  | "pendingTaxVerifications"
  | "pendingFundReleaseRequests"
  | "pendingTransactions"
  | "contactMessages";

type AlertDef = {
  key: AlertCountKey;
  title: string;
  href: string;
  sound: "alert" | "default";
  body: (data: AdminNotificationData, delta: number) => string;
};

function snapshotCounts(data: AdminNotificationData): Record<AlertCountKey, number> {
  return {
    unreadSupportChats: data.unreadSupportChats ?? 0,
    pendingDeposits: data.pendingDeposits ?? 0,
    pendingWithdrawals: data.pendingWithdrawals ?? 0,
    pendingWithdrawalCharges: data.pendingWithdrawalCharges ?? 0,
    pendingProfitTaxPayments: data.pendingProfitTaxPayments ?? 0,
    pendingKyc: data.pendingKyc ?? 0,
    pendingLoans: data.pendingLoans ?? 0,
    pendingCardRequests: data.pendingCardRequests ?? 0,
    pendingTaxVerifications: data.pendingTaxVerifications ?? 0,
    pendingFundReleaseRequests: data.pendingFundReleaseRequests ?? 0,
    pendingTransactions: data.pendingTransactions ?? 0,
    contactMessages: data.contactMessages ?? 0,
  };
}

export default function AdminTopBar() {
  const { t } = useI18n();
  const { data, lastUpdated } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountsRef = useRef<Record<AlertCountKey, number> | null>(null);
  const seenDepositIdsRef = useRef<Set<string>>(new Set());
  const seenSupportIdsRef = useRef<Set<string>>(new Set());
  const pushReadyRef = useRef(false);

  const alertDefs: AlertDef[] = [
    {
      key: "unreadSupportChats",
      title: t("admin.alertSupportTitle"),
      href: "/admin/messages",
      sound: "alert",
      body: (d, delta) => {
        const latest = d.recentSupportAlerts?.[0];
        if (latest) return t("admin.alertSupportBody", { name: latest.userName, preview: latest.preview });
        return t("admin.alertCountBody", { count: String(delta) });
      },
    },
    {
      key: "pendingDeposits",
      title: t("admin.depositToastTitle"),
      href: "/admin/deposits",
      sound: "alert",
      body: (d, delta) => {
        const latest = d.recentDepositAlerts?.[0];
        if (latest) {
          return t("admin.depositToastDesc", {
            name: latest.userName,
            amount: latest.amountUsd != null ? formatCurrency(latest.amountUsd) : t("admin.amountNotSpecified"),
          });
        }
        return t("admin.alertCountBody", { count: String(delta) });
      },
    },
    {
      key: "pendingWithdrawals",
      title: t("admin.alertWithdrawalTitle"),
      href: "/admin/withdrawals",
      sound: "alert",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingWithdrawalCharges",
      title: t("admin.alertChargeTitle"),
      href: "/admin/withdrawal-charges",
      sound: "alert",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingProfitTaxPayments",
      title: t("admin.alertProfitTaxTitle"),
      href: "/admin/profit-tax",
      sound: "alert",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingKyc",
      title: t("admin.alertKycTitle"),
      href: "/admin/kyc",
      sound: "default",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingLoans",
      title: t("admin.alertLoanTitle"),
      href: "/admin/loans",
      sound: "alert",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingCardRequests",
      title: t("admin.alertCardTitle"),
      href: "/admin/card-requests",
      sound: "default",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingTaxVerifications",
      title: t("admin.alertTaxTitle"),
      href: "/admin/tax-verifications",
      sound: "default",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingFundReleaseRequests",
      title: t("admin.alertFundReleaseTitle"),
      href: "/admin/frozen-accounts",
      sound: "alert",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "pendingTransactions",
      title: t("admin.alertTransactionTitle"),
      href: "/admin/transactions",
      sound: "default",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
    {
      key: "contactMessages",
      title: t("admin.alertContactTitle"),
      href: "/admin/messages",
      sound: "default",
      body: (_d, delta) => t("admin.alertCountBody", { count: String(delta) }),
    },
  ];

  useEffect(() => {
    unlockNotificationAudio();
    void ensureBrowserNotificationPermission();
  }, []);

  useEffect(() => {
    if (!data) return;

    const next = snapshotCounts(data);
    const prev = prevCountsRef.current;

    if (pushReadyRef.current && prev) {
      const fired: AlertDef[] = [];
      for (const def of alertDefs) {
        const delta = next[def.key] - (prev[def.key] ?? 0);
        if (delta > 0) fired.push(def);
      }

      if (fired.length > 0) {
        const preferChat = fired.find((f) => f.key === "unreadSupportChats");
        const primary = preferChat ?? fired[0];
        void playNotificationSound(primary.sound);

        for (const def of fired) {
          const delta = next[def.key] - (prev[def.key] ?? 0);
          const body = def.body(data, delta);

          if (def.key === "unreadSupportChats") {
            const fresh = (data.recentSupportAlerts ?? []).filter((a) => !seenSupportIdsRef.current.has(a.id));
            const latest = fresh[0] ?? data.recentSupportAlerts?.[0];
            toast(def.title, {
              description: latest
                ? t("admin.alertSupportBody", { name: latest.userName, preview: latest.preview })
                : body,
              duration: 10000,
              action: { label: t("admin.alertOpen"), onClick: () => window.location.assign(def.href) },
            });
            showBrowserNotification(
              def.title,
              latest
                ? t("admin.alertSupportBody", { name: latest.userName, preview: latest.preview })
                : body,
              latest?.id ?? `support-${Date.now()}`,
              { force: true }
            );
          } else if (def.key === "pendingDeposits") {
            const fresh = (data.recentDepositAlerts ?? []).filter((a) => !seenDepositIdsRef.current.has(a.id));
            const latest = fresh[0] ?? data.recentDepositAlerts?.[0];
            toast(def.title, {
              description: body,
              duration: 8000,
              action: { label: t("admin.alertOpen"), onClick: () => window.location.assign(def.href) },
            });
            showBrowserNotification(
              t("admin.depositBrowserTitle"),
              latest
                ? t("admin.depositSubmittedForReview", { name: latest.userName })
                : body,
              latest?.id ?? `deposit-${Date.now()}`,
              { force: true }
            );
          } else {
            toast(def.title, {
              description: body,
              duration: 8000,
              action: { label: t("admin.alertOpen"), onClick: () => window.location.assign(def.href) },
            });
            showBrowserNotification(def.title, body, `${def.key}-${Date.now()}`, { force: true });
          }
        }
      }
    }

    (data.recentDepositAlerts ?? []).forEach((a) => seenDepositIdsRef.current.add(a.id));
    (data.recentSupportAlerts ?? []).forEach((a) => seenSupportIdsRef.current.add(a.id));
    prevCountsRef.current = next;
    pushReadyRef.current = true;
    // alertDefs rebuilt each render via t(); intentionally depend on data + t only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, t]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const depositAlerts = data?.recentDepositAlerts ?? [];
  const supportAlerts = data?.recentSupportAlerts ?? [];
  const total = data?.totalAlerts ?? 0;

  const queueSummary = [
    { label: t("admin.alertSupportTitle"), count: data?.unreadSupportChats ?? 0, href: "/admin/messages" },
    { label: t("admin.deposits"), count: data?.pendingDeposits ?? 0, href: "/admin/deposits" },
    { label: t("admin.withdrawals"), count: data?.pendingWithdrawals ?? 0, href: "/admin/withdrawals" },
    { label: t("admin.withdrawalCharges"), count: data?.pendingWithdrawalCharges ?? 0, href: "/admin/withdrawal-charges" },
    { label: t("admin.profitTax"), count: data?.pendingProfitTaxPayments ?? 0, href: "/admin/profit-tax" },
    { label: t("admin.kycReview"), count: data?.pendingKyc ?? 0, href: "/admin/kyc" },
    { label: t("admin.loanManagement"), count: data?.pendingLoans ?? 0, href: "/admin/loans" },
    { label: t("admin.cardRequests"), count: data?.pendingCardRequests ?? 0, href: "/admin/card-requests" },
  ].filter((q) => q.count > 0);

  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-6 border-b border-white/5 bg-[var(--admin-bg)]/80 backdrop-blur-md flex items-center gap-3 pl-12 lg:pl-6">
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs text-[var(--admin-muted)] truncate hidden xl:inline">{t("adminFetch.liveSyncShort")}</span>
        <span className="text-xs text-[var(--admin-muted)] hidden sm:inline xl:hidden">{t("adminFetch.live")}</span>
      </div>

      <div className="flex-1 min-w-0 flex justify-center px-1 sm:px-2">
        <AdminGlobalSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <LanguageSelector variant="compact" />
        <ThemeToggle size="sm" />
        {lastUpdated && (
          <span className="text-[10px] text-[var(--admin-muted)] hidden sm:inline">
            Last sync {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => {
              unlockNotificationAudio();
              void ensureBrowserNotificationPermission();
              setOpen((v) => !v);
            }}
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
            <div className="absolute right-0 mt-2 w-[min(100vw-2rem,380px)] max-h-[min(70vh,480px)] overflow-y-auto rounded-xl border border-white/10 bg-[var(--admin-card)] shadow-2xl">
              <div className="p-4 border-b border-white/10">
                <p className="text-sm font-semibold text-white">{t("admin.notificationsTitle")}</p>
                <p className="text-[10px] text-[var(--admin-muted)] mt-0.5">
                  {t("admin.notificationsSubtitle", { count: String(total) })}
                </p>
              </div>

              {queueSummary.length > 0 && (
                <ul className="px-3 py-2 border-b border-white/5 space-y-1">
                  {queueSummary.map((q) => (
                    <li key={q.href + q.label}>
                      <Link
                        href={q.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-[var(--admin-muted)] hover:bg-white/5 hover:text-white"
                      >
                        <span>{q.label}</span>
                        <span className="font-bold text-[var(--admin-accent)]">{q.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {supportAlerts.length > 0 && (
                <ul className="divide-y divide-white/5 border-b border-white/5">
                  {supportAlerts.map((a) => (
                    <li key={a.id} className="p-4 hover:bg-white/[0.02]">
                      <Link href="/admin/messages" onClick={() => setOpen(false)} className="flex items-start gap-3">
                        <MessageSquare size={16} className="text-sky-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{t("admin.alertSupportTitle")}</p>
                          <p className="text-xs text-[var(--admin-muted)] mt-1">
                            <strong className="text-white/80">{a.userName}</strong>
                          </p>
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">{a.preview}</p>
                          <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                            {new Date(a.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {depositAlerts.length === 0 && supportAlerts.length === 0 && queueSummary.length === 0 ? (
                <p className="p-4 text-sm text-[var(--admin-muted)]">{t("admin.notificationsEmpty")}</p>
              ) : depositAlerts.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {depositAlerts.map((a) => (
                    <li key={a.id} className="p-4 hover:bg-white/[0.02]">
                      <div className="flex items-start gap-3">
                        <Bitcoin size={16} className="text-[var(--admin-accent)] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium">{t("admin.newDepositRequest")}</p>
                          <p className="text-xs text-[var(--admin-muted)] mt-1">
                            <strong className="text-white/80">{a.userName}</strong> · ID: {a.userId.slice(0, 12)}…
                          </p>
                          <p className="text-xs text-[var(--admin-muted)]">
                            Amount: {a.amountUsd != null ? formatCurrency(a.amountUsd) : t("admin.amountNotSpecified")}
                          </p>
                          <p className="text-[10px] text-[var(--admin-muted)] mt-1">
                            {new Date(a.createdAt).toLocaleString()} · {a.status}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="p-3 border-t border-white/10 grid gap-1">
                <Link
                  href="/admin/messages"
                  className="block text-center text-xs admin-link py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("admin.openSupportMessages")}
                </Link>
                <Link
                  href="/admin/deposits"
                  className="block text-center text-xs admin-link py-2"
                  onClick={() => setOpen(false)}
                >
                  {t("admin.openDepositManagement")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
