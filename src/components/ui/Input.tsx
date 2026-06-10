"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const inputClassName = cn(
      "w-full rounded-xl border border-border bg-surface-overlay px-4 py-3 text-text-primary placeholder:text-text-muted transition-colors focus:border-accent-brand focus:outline-none focus:ring-1 focus:ring-accent-brand/30",
      isPassword && "pr-11",
      error && "border-accent-red focus:border-accent-red focus:ring-accent-red/30",
      className
    );

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputClassName}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-accent-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
