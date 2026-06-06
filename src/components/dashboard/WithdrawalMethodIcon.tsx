import type { ReactNode } from "react";
import {
  SiZelle,
  SiPaypal,
  SiVenmo,
  SiCashapp,
  SiApplepay,
  SiGooglepay,
  SiVisa,
  SiMastercard,
  SiSwift,
  SiTether,
  SiCircle,
  SiWise,
} from "react-icons/si";
import { FaMoneyCheckDollar } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import type { WithdrawalMethodDef } from "@/lib/withdrawal-methods";

type Props = {
  method: WithdrawalMethodDef;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = { sm: 18, md: 22, lg: 28 };

function IconWrapper({ size, className, children }: { size: number; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

function DualIcon({
  size,
  left,
  right,
  className,
}: {
  size: number;
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  const half = Math.round(size * 0.55);
  return (
    <span className={cn("inline-flex items-center gap-0.5 shrink-0", className)}>
      <span style={{ width: half, height: half }} className="flex items-center justify-center">
        {left}
      </span>
      <span style={{ width: half, height: half }} className="flex items-center justify-center">
        {right}
      </span>
    </span>
  );
}

export default function WithdrawalMethodIcon({ method, size = "md", className }: Props) {
  const px = sizeMap[size];

  switch (method.iconKey) {
    case "ach":
      return (
        <IconWrapper size={px} className={className}>
          <SiWise size={px} color="#9FE870" aria-label="ACH transfer" />
        </IconWrapper>
      );
    case "wire":
      return (
        <IconWrapper size={px} className={className}>
          <SiSwift size={px} color="#F05138" aria-label="Wire transfer" />
        </IconWrapper>
      );
    case "zelle":
      return (
        <IconWrapper size={px} className={className}>
          <SiZelle size={px} color="#6D1ED4" aria-label="Zelle" />
        </IconWrapper>
      );
    case "paypal":
      return (
        <IconWrapper size={px} className={className}>
          <SiPaypal size={px} color="#003087" aria-label="PayPal" />
        </IconWrapper>
      );
    case "venmo":
      return (
        <IconWrapper size={px} className={className}>
          <SiVenmo size={px} color="#008CFF" aria-label="Venmo" />
        </IconWrapper>
      );
    case "cashapp":
      return (
        <IconWrapper size={px} className={className}>
          <SiCashapp size={px} color="#00C244" aria-label="Cash App" />
        </IconWrapper>
      );
    case "applepay":
      return (
        <IconWrapper size={px} className={className}>
          <SiApplepay size={px} color="#FFFFFF" aria-label="Apple Pay" />
        </IconWrapper>
      );
    case "googlepay":
      return (
        <IconWrapper size={px} className={className}>
          <SiGooglepay size={px} color="#FFFFFF" aria-label="Google Pay" />
        </IconWrapper>
      );
    case "debitcard":
      return (
        <DualIcon
          size={px}
          className={className}
          left={<SiVisa size={Math.round(px * 0.55)} color="#1A1F71" aria-hidden />}
          right={<SiMastercard size={Math.round(px * 0.55)} color="#EB001B" aria-hidden />}
        />
      );
    case "stablecoin":
      return (
        <DualIcon
          size={px}
          className={className}
          left={<SiCircle size={Math.round(px * 0.55)} color="#2775CA" aria-hidden />}
          right={<SiTether size={Math.round(px * 0.55)} color="#50AF95" aria-hidden />}
        />
      );
    case "check":
      return (
        <IconWrapper size={px} className={className}>
          <FaMoneyCheckDollar size={px} color="#C9A227" aria-label="Paper check" />
        </IconWrapper>
      );
    default:
      return null;
  }
}
