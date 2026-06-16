"use client";

import { motion } from "framer-motion";
import type { PhysicalCardTier } from "@prisma/client";
import { Wifi } from "lucide-react";
import AppIconMark from "@/components/ui/AppIconMark";
import { CARD_TIER_CONFIG } from "@/lib/physical-cards-constants";
import { cn } from "@/lib/utils";

type Props = {
  tier: PhysicalCardTier;
  cardholderName?: string;
  lastFour?: string;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "default" | "hero";
};

export default function PhysicalCardPreview({
  tier,
  cardholderName = "CARDHOLDER NAME",
  lastFour,
  className,
  selected,
  onClick,
  size = "default",
}: Props) {
  const theme = CARD_TIER_CONFIG[tier];
  const displayNumber = lastFour ? `•••• •••• •••• ${lastFour}` : "•••• •••• •••• ••••";
  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "pc-preview",
        size === "hero" && "pc-preview-hero",
        onClick && "pc-preview-interactive",
        selected && "pc-preview-selected",
        className
      )}
      whileHover={onClick ? { y: -6, scale: 1.015 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <div
        className="pc-card-face"
        style={{ background: theme.gradient, color: theme.text }}
      >
        <div className="pc-card-shine" aria-hidden />
        <div className="pc-card-texture" aria-hidden />
        <div className="pc-card-top">
          <div className="pc-card-brand">
            <AppIconMark size={18} className="pc-card-brand-icon rounded-md" />
            <span className="pc-card-brand-name">Blackrock Reserve</span>
          </div>
          <Wifi size={18} className="pc-card-contactless" style={{ color: theme.accent }} strokeWidth={2} />
        </div>
        <div className="pc-card-chip-row">
          <div className="pc-card-chip" style={{ background: theme.chip }}>
            <span className="pc-card-chip-line" />
            <span className="pc-card-chip-line" />
            <span className="pc-card-chip-line" />
          </div>
        </div>
        <p className="pc-card-number">{displayNumber}</p>
        <div className="pc-card-footer">
          <div className="min-w-0">
            <p className="pc-card-label">Cardholder</p>
            <p className="pc-card-value truncate">{cardholderName.toUpperCase()}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="pc-card-label">Tier</p>
            <p className="pc-card-value">{theme.shortLabel}</p>
          </div>
        </div>
        <div className="pc-card-network" style={{ color: theme.accent }}>
          VISA
        </div>
        <span className="pc-card-physical">Physical Debit</span>
      </div>
      {selected && <span className="pc-preview-selected-ring" aria-hidden />}
    </Wrapper>
  );
}
