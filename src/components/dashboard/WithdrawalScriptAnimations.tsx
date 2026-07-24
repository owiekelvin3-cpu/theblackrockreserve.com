"use client";

import { motion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function ScriptCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className={`dash-card p-6 sm:p-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function PendingTimerRing({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  const size = 112;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative mx-auto h-28 w-28">
      <motion.div
        className="absolute inset-0 rounded-full bg-accent-gold/[0.06]"
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg width={size} height={size} className="relative mx-auto block -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ws-pending-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.85, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ws-pending-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff8c42" />
            <stop offset="100%" stopColor="#ff5f05" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={secondsLeft}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-2xl font-bold tabular-nums text-white"
        >
          {secondsLeft}
        </motion.span>
        <span className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">sec</span>
      </div>
    </div>
  );
}

export function TransferFlowAnimation() {
  return (
    <div className="ws-transfer-track relative flex items-center justify-center gap-0 py-2 max-w-xs mx-auto">
      <motion.span
        className="ws-transfer-node z-10"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        Your account
      </motion.span>
      <div className="relative flex-1 h-10 mx-2 min-w-[4.5rem]">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-accent-gold/50 to-transparent" />
        <motion.div
          className="ws-transfer-dot absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-accent-gold shadow-[0_0_12px_rgba(255,95,5,0.65)]"
          animate={{ left: ["8%", "82%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.35 }}
        />
      </div>
      <motion.span
        className="ws-transfer-node z-10"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        Receiving bank
      </motion.span>
    </div>
  );
}

export function BankRejectedIllustration() {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
      className="mx-auto w-full max-w-[280px]"
    >
      <svg viewBox="0 0 280 160" fill="none" className="w-full h-auto" aria-hidden>
        <rect width="280" height="160" rx="12" fill="rgba(255,255,255,0.03)" />
        <motion.path
          d="M60 100 L120 100 L120 130 H60 Z M75 100 V75 L90 65 L105 75 V100"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          fill="rgba(255,255,255,0.04)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        />
        <motion.path
          d="M140 90 H220"
          stroke="#60a5fa"
          strokeWidth="2"
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.circle
          cx="200"
          cy="90"
          r="22"
          fill="rgba(239,68,68,0.12)"
          stroke="rgba(239,68,68,0.5)"
          strokeWidth="2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.path
          d="M192 82 L208 98 M208 82 L192 98"
          stroke="#f87171"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.45 }}
        />
        <motion.path
          d="M70 145 Q140 125 210 145"
          stroke="rgba(52,211,153,0.4)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        />
        <text x="140" y="152" textAnchor="middle" fill="rgba(52,211,153,0.9)" fontSize="10">
          Refunded to balance
        </text>
      </svg>
    </motion.div>
  );
}

export function SecurityHoldIllustration() {
  return (
    <div className="relative mx-auto h-24 w-24">
      <motion.div
        className="absolute inset-0 rounded-full border border-accent-red/30"
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
      />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent-red/10 border border-accent-red/25 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-accent-red/20 to-transparent ws-aml-scan"
          animate={{ top: ["-40%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <path
            d="M12 3L4 7v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4z"
            stroke="#f87171"
            strokeWidth="1.5"
            fill="rgba(239,68,68,0.15)"
          />
          <path d="M12 8v5M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      </div>
    </div>
  );
}

export function ImfHoldIllustration() {
  return (
    <motion.div
      className="mx-auto w-full max-w-[300px]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      <svg viewBox="0 0 300 170" fill="none" className="w-full h-auto" aria-hidden>
        <rect width="300" height="170" rx="12" fill="rgba(255,255,255,0.03)" />
        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M40 120 L90 95 L140 120 V150 H40 Z"
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
          />
          <rect x="55" y="108" width="70" height="8" fill="rgba(255,255,255,0.1)" rx="2" />
          <text x="90" y="88" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9">
            Central Bank
          </text>
        </motion.g>
        <motion.path
          d="M155 105 H245"
          stroke="#ff8c42"
          strokeWidth="2"
          strokeDasharray="5 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
        <motion.g
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: [0, 4, 0], opacity: 1 }}
          transition={{ x: { duration: 2.5, repeat: Infinity }, opacity: { duration: 0.4 } }}
        >
          <rect x="248" y="88" width="44" height="34" rx="6" fill="rgba(255,140,66,0.15)" stroke="rgba(255,140,66,0.45)" strokeWidth="1.5" />
          <circle cx="270" cy="105" r="8" fill="rgba(255,95,5,0.35)" />
          <path d="M266 105h8M270 101v8" stroke="#ff8c42" strokeWidth="1.5" strokeLinecap="round" />
        </motion.g>
        <motion.rect
          x="200"
          y="130"
          width="80"
          height="6"
          rx="3"
          fill="rgba(255,255,255,0.08)"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          style={{ transformOrigin: "left" }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />
      </svg>
    </motion.div>
  );
}

export function StaggerIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
