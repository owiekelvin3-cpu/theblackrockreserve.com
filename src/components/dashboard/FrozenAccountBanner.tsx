"use client";

import { useFrozenAccount } from "@/components/dashboard/FrozenAccountProvider";
import { useChat } from "@/components/providers/ChatProvider";
import { Headphones } from "lucide-react";

function formatFrozenDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FrozenAccountBanner() {
  const { isFrozen, freeze, loading } = useFrozenAccount();
  const { openHumanSupport } = useChat();

  if (loading || !isFrozen || !freeze) return null;

  return (
    <div className="dash-frozen-notice" role="alert" aria-live="polite">
      <div className="dash-frozen-notice-accent" aria-hidden="true" />
      <div className="dash-frozen-notice-inner">
        <div className="dash-frozen-notice-copy">
          <p className="dash-frozen-notice-title">Account restricted</p>
          <p className="dash-frozen-notice-reason" title={freeze.reason}>
            {freeze.reason}
          </p>
          <p className="dash-frozen-notice-meta">
            Since {formatFrozenDate(freeze.frozenAt)} · Withdrawals paused
          </p>
        </div>
        <button type="button" onClick={() => openHumanSupport()} className="dash-frozen-notice-action">
          <Headphones size={15} strokeWidth={2} aria-hidden="true" />
          Contact support
        </button>
      </div>
    </div>
  );
}
