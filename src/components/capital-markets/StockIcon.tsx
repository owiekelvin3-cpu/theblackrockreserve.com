"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getStockLogoSources } from "@/lib/stock-icons";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

interface StockIconProps {
  symbol: string;
  name?: string;
  logoDomain?: string | null;
  logoUrl?: string | null;
  size?: Size;
  className?: string;
}

export default function StockIcon({ symbol, name, logoDomain, logoUrl, size = "md", className }: StockIconProps) {
  const sources = getStockLogoSources(symbol, logoDomain, logoUrl);
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

  const px = SIZE_PX[size];

  return (
    <Image
      src={imgSrc}
      alt={`${name ?? symbol} logo`}
      width={px}
      height={px}
      unoptimized
      className={cn(
        box,
        "stock-icon-img rounded-xl object-contain p-1.5 shrink-0",
        className
      )}
      onError={() => setSourceIndex((i) => i + 1)}
      title={name ?? symbol}
    />
  );
}
