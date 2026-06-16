"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type AppIconMarkProps = {
  className?: string;
  size?: number;
};

/** Brand app icon — orange gradient squircle with four-dot grid */
export default function AppIconMark({ className, size = 32 }: AppIconMarkProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Blackrock Reserve"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5F05" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill={`url(#${gradientId})`} />
      <circle cx="13" cy="13" r="2.2" fill="#ffffff" />
      <circle cx="19" cy="13" r="2.2" fill="#ffffff" />
      <circle cx="13" cy="19" r="2.2" fill="#ffffff" />
      <circle cx="19" cy="19" r="2.2" fill="#ffffff" />
    </svg>
  );
}
