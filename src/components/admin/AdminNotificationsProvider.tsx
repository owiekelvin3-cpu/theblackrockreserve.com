"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AdminNotificationData = {
  totalAlerts: number;
  pendingDeposits: number;
  pendingTaxVerifications: number;
  pendingLoans: number;
  pendingCardRequests: number;
  pendingFundReleaseRequests: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  contactMessages: number;
  unreadSupportChats: number;
  pendingTransactions: number;
  pendingWithdrawalCharges: number;
  pendingProfitTaxPayments: number;
  recentDepositAlerts: {
    id: string;
    depositId: string;
    userId: string;
    userName: string;
    userEmail: string;
    amountUsd: number | null;
    bitcoinWalletAddress: string | null;
    txHash: string | null;
    status: string;
    createdAt: string;
  }[];
  recentSupportAlerts: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    preview: string;
    createdAt: string;
  }[];
};

type AdminNotificationsContextValue = {
  data: AdminNotificationData | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

const AdminNotificationsContext = createContext<AdminNotificationsContextValue>({
  data: null,
  lastUpdated: null,
  refresh: () => {},
});

/** Fast enough for support chat; still polls when the tab is in the background. */
const POLL_MS = 12_000;

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminNotificationData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as AdminNotificationData;
      setData({
        ...json,
        pendingWithdrawalCharges: json.pendingWithdrawalCharges ?? 0,
        pendingProfitTaxPayments: json.pendingProfitTaxPayments ?? 0,
        recentSupportAlerts: json.recentSupportAlerts ?? [],
      });
      setLastUpdated(new Date());
    } catch {
      /* polling should not break layout */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <AdminNotificationsContext.Provider value={{ data, lastUpdated, refresh }}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  return useContext(AdminNotificationsContext);
}

export type AdminSidebarCounts = {
  pendingDeposits: number;
  pendingTaxVerifications: number;
  pendingLoans: number;
  pendingCardRequests: number;
  pendingFundReleaseRequests: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  contactMessages: number;
  unreadSupportChats: number;
  pendingTransactions: number;
  pendingWithdrawalCharges: number;
  pendingProfitTaxPayments: number;
};
