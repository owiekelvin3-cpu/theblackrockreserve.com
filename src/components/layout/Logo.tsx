import Link from "next/link";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const iconSizes = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };
  const textSizes = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex ${iconSizes[size]} items-center justify-center rounded-xl brand-gradient-bg shadow-brand`}
      >
        <div className="grid grid-cols-2 gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-[5px] w-[5px] rounded-full bg-white" />
          ))}
        </div>
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold tracking-tight text-white`}>
          Blackrock<span className="text-accent-brand">Reserve</span>
        </span>
      )}
    </Link>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`font-bold tracking-tight text-white ${className}`}>
      Blackrock<span className="text-accent-brand">Reserve</span>
    </div>
  );
}
