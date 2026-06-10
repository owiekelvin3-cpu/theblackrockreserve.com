"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getStockLogoSources } from "@/lib/stock-icons";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

interface StockIconProps {
  symbol: string;
  name?: string;
  logoDomain?: string | null;
  size?: Size;
  className?: string;
}

export default function StockIcon({ symbol, name, logoDomain, size = "md", className }: StockIconProps) {
  const sources = getStockLogoSources(symbol, logoDomain);
  const [sourceIndex, setSourceIndex] = useState(0);
  const initials = symbol.slice(0, 2).toUpperCase();
  const box = SIZE_CLASS[size];

  const imgSrc = sources[sourceIndex];

  if (!imgSrc || sourceIndex >= sources.length) {
    return (
      <div
        className={cn(
          box,
          "rounded-xl bg-gradient-to-br from-accent-brand/20 to-accent-brand/5 border border-accent-brand/20 flex items-center justify-center text-xs font-bold text-accent-brand shrink-0",
          className
        )}
        title={name ?? symbol}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`${name ?? symbol} logo`}
      className={cn(
        box,
        "rounded-xl object-contain bg-white/5 border border-[var(--border-subtle)] p-1.5 shrink-0",
        className
      )}
      loading="lazy"
      onError={() => setSourceIndex((i) => i + 1)}
      title={name ?? symbol}
    />
  );
}
