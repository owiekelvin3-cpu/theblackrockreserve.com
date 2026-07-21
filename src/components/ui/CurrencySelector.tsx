"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Coins, Check } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useHydrated } from "@/hooks/use-hydrated";
import { getCurrencyOptionsForBadge } from "@/lib/currency";
import { useProfileImage } from "@/components/providers/ProfileImageProvider";
import { cn } from "@/lib/utils";

type Variant = "compact" | "full";

interface CurrencySelectorProps {
  variant?: Variant;
  className?: string;
}

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const COMPACT_MENU_WIDTH = 280;
const MENU_GAP = 8;
const VIEWPORT_PADDING = 8;

export default function CurrencySelector({ variant = "compact", className }: CurrencySelectorProps) {
  const { preferredCurrency, setPreferredCurrency, t } = useI18n();
  const { verificationBadge } = useProfileImage();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const currencyOptions = getCurrencyOptionsForBadge(verificationBadge);
  const current = currencyOptions.find((c) => c.code === preferredCurrency) ?? currencyOptions[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = variant === "full" ? rect.width : COMPACT_MENU_WIDTH;
    let left = variant === "full" ? rect.left : rect.right - width;
    left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - width - VIEWPORT_PADDING));

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const preferredMaxHeight = 320;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      preferredMaxHeight,
      openUpward ? spaceAbove - MENU_GAP : spaceBelow - MENU_GAP
    );

    setMenuPosition({
      top: openUpward ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      left,
      width,
      maxHeight,
    });
  }, [variant]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    const onResize = () => updateMenuPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (code: typeof current.code) => {
    setPreferredCurrency(code);
    setOpen(false);
  };

  const menu =
    open && menuPosition && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={t("settings.currencyPreference")}
            className="fixed z-[9999] overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-2xl py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
              transform: menuPosition.top < (buttonRef.current?.getBoundingClientRect().top ?? 0)
                ? "translateY(-100%)"
                : undefined,
            }}
          >
            {currencyOptions.map((option) => {
              const selected = option.code === preferredCurrency;
              return (
                <li key={option.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.code)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "bg-accent-gold/10 text-accent-gold"
                        : "text-text-primary hover:bg-bg-tertiary"
                    )}
                  >
                    <span className="font-mono text-xs w-10 shrink-0">{option.code}</span>
                    <span className="flex-1 min-w-0 truncate">
                      {option.name}
                      <span className="text-text-muted ml-1">({option.symbol})</span>
                    </span>
                    {selected && <Check size={16} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  if (!hydrated) {
    return (
      <div
        className={cn(
          variant === "full" ? "profile-lang-select w-full" : "h-9 w-[120px] rounded-lg bg-bg-tertiary",
          className
        )}
      />
    );
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 transition-colors",
          variant === "full"
            ? "profile-lang-select w-full justify-between"
            : "h-9 px-3 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary text-sm"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Coins size={16} className="text-text-muted shrink-0" />
          <span className="truncate font-medium">{current.code}</span>
          <span className="text-text-muted truncate hidden sm:inline">{current.symbol}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn("text-text-muted shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {menu}
    </div>
  );
}
