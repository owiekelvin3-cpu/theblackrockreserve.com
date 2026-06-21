"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchDashboardJson } from "@/lib/fetch-json";

export type AccountFreezeInfo = {
  id: string;
  freezeType: "FULL" | "WITHDRAWAL_ONLY";
  freezeTypeLabel: string;
  reason: string;
  frozenAt: string;
};

type FrozenAccountContextValue = {
  isFrozen: boolean;
  freeze: AccountFreezeInfo | null;
  loading: boolean;
  refresh: () => void;
};

const FrozenAccountContext = createContext<FrozenAccountContextValue>({
  isFrozen: false,
  freeze: null,
  loading: true,
  refresh: () => {},
});

export function FrozenAccountProvider({ children }: { children: ReactNode }) {
  const [isFrozen, setIsFrozen] = useState(false);
  const [freeze, setFreeze] = useState<AccountFreezeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetchDashboardJson<{ isFrozen: boolean; freeze: AccountFreezeInfo | null }>(
      "/api/dashboard/account-freeze"
    ).then(({ data }) => {
      if (data) {
        setIsFrozen(data.isFrozen);
        setFreeze(data.freeze);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return (
    <FrozenAccountContext.Provider value={{ isFrozen, freeze, loading, refresh }}>
      {children}
    </FrozenAccountContext.Provider>
  );
}

export function useFrozenAccount() {
  return useContext(FrozenAccountContext);
}
