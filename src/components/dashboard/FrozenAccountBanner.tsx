"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Headphones, Snowflake } from "lucide-react";
import { useFrozenAccount } from "@/components/dashboard/FrozenAccountProvider";
import { useChat } from "@/components/providers/ChatProvider";

export default function FrozenAccountBanner() {
  const { isFrozen, freeze, loading } = useFrozenAccount();
  const { openHumanSupport } = useChat();

  if (loading || !isFrozen || !freeze) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="mb-6 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-red-500/10 overflow-hidden shadow-lg shadow-amber-500/5"
      role="alert"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Snowflake size={22} className="text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-amber-100">Account Status: Frozen</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle size={10} />
                {freeze.freezeTypeLabel}
              </span>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-amber-200/60 font-medium">Reason</dt>
                <dd className="text-amber-50/90 leading-relaxed">{freeze.reason}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-amber-200/60 font-medium">Date Frozen</dt>
                <dd className="text-amber-100/80">
                  {new Date(freeze.frozenAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-amber-200/70 mt-2 leading-relaxed">
              Withdrawals are temporarily disabled. Your balance and transaction history remain visible.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openHumanSupport()}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-semibold transition-colors shadow-md shadow-amber-500/20 w-full sm:w-auto"
        >
          <Headphones size={16} />
          Contact Support
        </button>
      </div>
    </motion.div>
  );
}
