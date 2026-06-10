"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TransactionPinInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export default function TransactionPinInput({
  value,
  onChange,
  disabled,
  autoFocus,
  className,
}: TransactionPinInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState(["", "", "", ""]);

  useEffect(() => {
    const next = value.padEnd(4, " ").slice(0, 4).split("").map((d) => (d === " " ? "" : d));
    setDigits(next);
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const updateDigits = (next: string[]) => {
    setDigits(next);
    onChange(next.join(""));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    updateDigits(next);
    if (digit && index < 3) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    updateDigits(next);
    inputsRef.current[Math.min(pasted.length, 3)]?.focus();
  };

  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-white/15 bg-white/[0.04] text-center text-lg font-semibold text-text-primary tracking-widest focus:border-accent-brand/50 focus:outline-none focus:ring-2 focus:ring-accent-brand/20 disabled:opacity-50"
          aria-label={`PIN digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
