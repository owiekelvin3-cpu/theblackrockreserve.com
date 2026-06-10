"use client";

export function WithdrawalChargeIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="wc-bg" x1="0" y1="0" x2="320" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a2332" />
          <stop offset="1" stopColor="#0f1419" />
        </linearGradient>
        <linearGradient id="wc-shield" x1="120" y1="40" x2="200" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="wc-card" x1="40" y1="90" x2="140" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2a2f3a" />
          <stop offset="1" stopColor="#1c2028" />
        </linearGradient>
        <linearGradient id="wc-accent" x1="200" y1="100" x2="280" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff8c42" />
          <stop offset="1" stopColor="#ff5f05" />
        </linearGradient>
      </defs>

      <rect width="320" height="200" rx="16" fill="url(#wc-bg)" />

      <circle cx="260" cy="44" r="28" fill="rgba(59,130,246,0.12)" />
      <circle cx="48" cy="156" r="36" fill="rgba(255,95,5,0.08)" />

      {/* Bank building */}
      <path
        d="M52 118 L92 98 L132 118 V158 H52 Z"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      <path d="M62 118 V148 M82 118 V148 M102 118 V148 M122 118 V148" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <path d="M48 118 H136" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <circle cx="92" cy="88" r="6" fill="rgba(255,255,255,0.2)" />

      {/* Shield — trust */}
      <path
        d="M160 48 C160 48 196 58 196 78 V108 C196 132 160 152 160 152 C160 152 124 132 124 108 V78 C124 58 160 48 160 48Z"
        fill="url(#wc-shield)"
        fillOpacity="0.9"
      />
      <path
        d="M148 98 L156 106 L174 84"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Payment card */}
      <rect x="196" y="108" width="96" height="62" rx="10" fill="url(#wc-card)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
      <rect x="208" y="120" width="48" height="8" rx="4" fill="rgba(255,255,255,0.15)" />
      <rect x="208" y="136" width="72" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="208" y="148" width="40" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
      <circle cx="272" cy="154" r="10" fill="url(#wc-accent)" fillOpacity="0.85" />
      <circle cx="276" cy="154" r="10" fill="rgba(255,140,66,0.5)" />

      {/* Transfer arrow */}
      <path
        d="M142 128 H178"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <path d="M172 122 L182 128 L172 134" fill="#60a5fa" />

      {/* Document stamp */}
      <rect x="228" y="52" width="56" height="44" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <rect x="238" y="62" width="36" height="4" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="238" y="72" width="28" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
      <circle cx="268" cy="86" r="8" stroke="#34d399" strokeWidth="2" fill="rgba(52,211,153,0.15)" />
      <path d="M264 86 L267 89 L272 82" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
