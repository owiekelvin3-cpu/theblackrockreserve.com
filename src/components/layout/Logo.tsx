import Link from "next/link";
import AppIconMark from "@/components/ui/AppIconMark";
import { cn } from "@/lib/utils";

const iconSizes = { sm: 28, md: 36, lg: 44, xl: 64 } as const;
const textSizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
} as const;

type LogoSize = keyof typeof iconSizes;

interface LogoProps {
  className?: string;
  showText?: boolean;
  showIcon?: boolean;
  size?: LogoSize;
  href?: string | null;
  textClassName?: string;
}

function BrandWordmark({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span className={cn("font-bold tracking-tight text-text-primary", textSizes[size], className)}>
      Blackrock<span className="text-accent-brand">Reserve</span>
    </span>
  );
}

function LogoContent({
  showText = true,
  showIcon = true,
  size = "md",
  textClassName,
}: Pick<LogoProps, "showText" | "showIcon" | "size" | "textClassName">) {
  return (
    <>
      {showIcon && (
        <AppIconMark
          size={iconSizes[size]}
          className="rounded-xl shadow-brand"
        />
      )}
      {showText && <BrandWordmark size={size} className={cn("truncate", textClassName)} />}
    </>
  );
}

export default function Logo({
  className = "",
  showText = true,
  showIcon = true,
  size = "md",
  href = "/",
  textClassName,
}: LogoProps) {
  const content = (
    <LogoContent
      showText={showText}
      showIcon={showIcon}
      size={size}
      textClassName={textClassName}
    />
  );

  if (href === null) {
    return (
      <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={cn("flex items-center gap-2.5 min-w-0", className)}>
      {content}
    </Link>
  );
}

export function LogoMark({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <AppIconMark
      size={iconSizes[size]}
      className={cn("rounded-xl shadow-brand", className)}
    />
  );
}

export function LogoWordmark({
  className = "",
  showIcon = true,
  iconSize = "xl",
  stacked = true,
}: {
  className?: string;
  showIcon?: boolean;
  iconSize?: LogoSize;
  stacked?: boolean;
}) {
  if (!showIcon) {
    return <BrandWordmark size="xl" className={className} />;
  }

  if (stacked) {
    return (
      <div className={cn("flex flex-col items-center gap-3 sm:gap-4", className)}>
        <LogoMark size={iconSize} className="rounded-2xl" />
        <BrandWordmark size="xl" className="text-center" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      <LogoMark size={iconSize} className="rounded-2xl" />
      <BrandWordmark size="xl" />
    </div>
  );
}
