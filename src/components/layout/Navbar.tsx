"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

const NAV_OFFSET = 96;

const navLinks = [
  { href: "/", labelKey: "nav.home" },
  { href: "/about", labelKey: "nav.about" },
  { href: "/features", labelKey: "nav.features" },
  { href: "/investments", labelKey: "nav.investments" },
  { href: "/contact", labelKey: "nav.contact" },
] as const;

const primaryLinkClass =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all btn-gold px-5 py-2.5 text-sm rounded-full";

export default function Navbar() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hash, setHash] = useState("");
  const pathname = usePathname();

  const syncHash = useCallback(() => {
    setHash(typeof window !== "undefined" ? window.location.hash : "");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    syncHash();
  }, [pathname, syncHash]);

  useEffect(() => {
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [syncHash]);

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const timer = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
        window.scrollTo({ behavior: "smooth", top });
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" && !hash;
    }
    if (href.includes("#")) {
      const [path, h] = href.split("#");
      return pathname === path && hash === `#${h}`;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 sm:pt-5 sm:px-6">
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6">
        <div className="relative z-[60] shrink-0">
          <Logo />
        </div>

        <div className="hidden lg:flex min-w-0 justify-center">
          <div className="glass-dock flex max-w-full items-center gap-1 px-2 py-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  isActive(link.href)
                    ? "bg-accent-brand/15 text-white border border-accent-brand/30 shadow-[0_0_20px_rgba(255,95,5,0.2)]"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                )}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative z-[60] flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <LanguageSelector className="hidden md:block" />
          <ThemeToggle size="sm" className="hidden sm:inline-flex" />
          <Link
            href="/login"
            className="hidden lg:inline-flex text-sm font-medium text-text-secondary hover:text-text-primary transition-colors px-3 py-2"
          >
            {t("common.signIn")}
          </Link>
          <Link href="/register" className={cn(primaryLinkClass, "hidden lg:inline-flex")}>
            {t("common.signUp")} <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            className="lg:hidden p-2.5 rounded-xl text-text-primary hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden relative z-50 mt-3 mx-auto max-w-7xl glass-card p-4 max-h-[calc(100vh-6rem)] overflow-y-auto"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive(link.href)
                        ? "bg-accent-brand/15 text-accent-brand"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                    )}
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
                <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-3">
                  <LanguageSelector variant="full" />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-text-secondary">{t("common.appearance")}</span>
                    <ThemeToggle size="sm" />
                  </div>
                  <Link
                    href="/login"
                    className="w-full text-center px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-full border border-white/10 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("common.signIn")}
                  </Link>
                  <Link href="/register" className={cn(primaryLinkClass, "w-full")} onClick={() => setMobileOpen(false)}>
                    {t("common.signUp")} <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
