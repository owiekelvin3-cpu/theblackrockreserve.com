"use client";

import { motion } from "framer-motion";
import { Landmark, X } from "lucide-react";
import WithdrawalMethodIcon from "@/components/dashboard/WithdrawalMethodIcon";
import type { WithdrawalMethodDef } from "@/lib/withdrawal-methods";

export function PayoutTransitLogoAnimation({
  method,
  institutionLabel,
}: {
  method: WithdrawalMethodDef;
  institutionLabel?: string;
}) {
  const destLabel = institutionLabel ?? method.label;

  return (
    <div className="inst-payout-transit" aria-hidden>
      <div className="inst-payout-transit-col">
        <div className="inst-payout-transit-badge inst-payout-transit-badge-bank">
          <Landmark size={22} strokeWidth={1.75} className="text-slate-300" />
        </div>
        <p className="inst-payout-transit-label">Our bank</p>
      </div>

      <div className="inst-payout-transit-bridge">
        <div className="inst-payout-transit-line" />
        <motion.span
          className="inst-payout-transit-dot"
          animate={{ left: ["6%", "88%"] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.25 }}
        />
      </div>

      <div className="inst-payout-transit-col">
        <motion.div
          className="inst-payout-transit-badge inst-payout-transit-badge-dest"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.span
            className="inst-payout-transit-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="inst-payout-transit-ring inst-payout-transit-ring-inner"
            animate={{ rotate: -360 }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
          />
          <span className="inst-payout-transit-logo">
            <WithdrawalMethodIcon method={method} size="lg" className="scale-110" />
          </span>
        </motion.div>
        <p className="inst-payout-transit-label inst-payout-transit-label-dest">{destLabel}</p>
      </div>
    </div>
  );
}

/** Bank → payout logo with declined connection (bank-rejected script screen). */
export function BankRejectPayoutHero({
  method,
  institutionLabel,
}: {
  method: WithdrawalMethodDef;
  institutionLabel?: string;
}) {
  const destLabel = institutionLabel ?? method.label;

  return (
    <div className="inst-payout-reject-wrap">
      <div className="inst-payout-transit inst-payout-reject">
      <div className="inst-payout-transit-col">
        <div className="inst-payout-transit-badge inst-payout-transit-badge-bank">
          <Landmark size={22} strokeWidth={1.75} className="text-slate-300" />
        </div>
        <p className="inst-payout-transit-label">Our bank</p>
      </div>

      <div className="inst-payout-transit-bridge inst-payout-reject-bridge">
        <div className="inst-payout-transit-line inst-payout-reject-line" />
        <span className="inst-payout-reject-x" aria-hidden>
          <X size={14} strokeWidth={2.5} />
        </span>
      </div>

      <div className="inst-payout-transit-col">
        <div className="inst-payout-transit-badge inst-payout-transit-badge-dest inst-payout-reject-dest">
          <span className="inst-payout-transit-logo">
            <WithdrawalMethodIcon method={method} size="lg" className="scale-110" />
          </span>
          <span className="inst-payout-reject-dest-x" aria-hidden>
            <X size={11} strokeWidth={3} />
          </span>
        </div>
        <p className="inst-payout-transit-label inst-payout-transit-label-dest">{destLabel}</p>
      </div>
      </div>
      <p className="inst-payout-reject-refund">Refunded to balance</p>
    </div>
  );
}
