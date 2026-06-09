"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Clock } from "lucide-react";
import { getFirstName } from "@/lib/greeting";
import { useLiveClock } from "@/hooks/use-live-clock";
import { fadeUp } from "@/components/ui/AnimateIn";

export default function DashboardGreeting() {
  const { data: session } = useSession();
  const firstName = useMemo(() => getFirstName(session?.user?.name), [session?.user?.name]);
  const { clock, ready } = useLiveClock(firstName);

  if (!ready || !clock) {
    return (
      <div className="h-16 w-48 animate-pulse rounded-lg bg-white/5" aria-hidden="true" />
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 w-full"
      aria-label="Personalized welcome"
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[1.65rem] font-bold text-text-primary tracking-tight" aria-live="polite">
          {clock.greeting}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{clock.dateLine}</p>
      </div>

      <div
        className="flex items-center gap-3 shrink-0"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Clock size={18} className="text-accent-brand" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <time
          dateTime={new Date().toISOString()}
          className="font-mono text-xl sm:text-2xl font-semibold text-text-primary tabular-nums tracking-tight"
        >
          {clock.timeLine}
        </time>
      </div>

      <span className="sr-only">
        {clock.greeting}. Today is {clock.dateLine}. The current time is {clock.timeLine}.
      </span>
    </motion.div>
  );
}
