"use client";

import { cn } from "@/lib/utils";

/** BlackRock-style wordmark for institutional bank rail UI (owner-provided branding direction). */
export default function BlackRockWordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline leading-none select-none",
        compact ? "text-[11px]" : "text-sm",
        className
      )}
      aria-label="BlackRock"
    >
      <span className="br-wordmark-part br-wordmark-bold font-bold tracking-tight">Black</span>
      <span className="br-wordmark-part br-wordmark-regular font-normal tracking-tight">Rock</span>
    </span>
  );
}
