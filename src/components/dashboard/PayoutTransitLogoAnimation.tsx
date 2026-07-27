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
    <motion.div
      className="inst-payout-reject-wrap"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="inst-payout-transit inst-payout-reject">
        <div className="inst-payout-transit-col">
          <motion.div
            className="inst-payout-transit-badge inst-payout-transit-badge-bank"
            animate={{ scale: [1, 1.03, 1], opacity: [0.92, 1, 0.92] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Landmark size={22} strokeWidth={1.75} className="text-slate-300" />
          </motion.div>
          <p className="inst-payout-transit-label">Our bank</p>
        </div>

        <div className="inst-payout-transit-bridge inst-payout-reject-bridge">
          <div className="inst-payout-transit-line inst-payout-reject-line" />
          <motion.span
            className="inst-payout-transit-dot inst-payout-reject-dot"
            animate={{
              left: ["6%", "42%", "6%"],
              opacity: [0.3, 1, 0.25],
              scale: [0.85, 1, 0.85],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="inst-payout-reject-x"
            aria-hidden
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.12, 1], opacity: 1 }}
            transition={{
              opacity: { duration: 0.35, delay: 0.2 },
              scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.35 },
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </motion.span>
        </div>

        <div className="inst-payout-transit-col">
          <motion.div
            className="inst-payout-transit-badge inst-payout-transit-badge-dest inst-payout-reject-dest"
            animate={{ scale: [1, 1.035, 1] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          >
            <motion.span
              className="inst-payout-transit-ring inst-payout-reject-ring"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <motion.span
              className="inst-payout-transit-ring inst-payout-transit-ring-inner inst-payout-reject-ring-inner"
              animate={{ rotate: -360 }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
            />
            <span className="inst-payout-transit-logo">
              <WithdrawalMethodIcon method={method} size="lg" className="scale-110" />
            </span>
            <motion.span
              className="inst-payout-reject-dest-x"
              aria-hidden
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: [1, 1.08, 1], rotate: 0 }}
              transition={{
                rotate: { type: "spring", stiffness: 380, damping: 18, delay: 0.25 },
                scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
              }}
            >
              <X size={11} strokeWidth={3} />
            </motion.span>
          </motion.div>
          <p className="inst-payout-transit-label inst-payout-transit-label-dest">{destLabel}</p>
        </div>
      </div>
      <motion.p
        className="inst-payout-reject-refund"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: [0.75, 1, 0.75], y: 0 }}
        transition={{
          opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
          y: { duration: 0.4, delay: 0.45 },
        }}
      >
        Refunded to balance
      </motion.p>
    </motion.div>
  );
}
