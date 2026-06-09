"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import Logo from "./Logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Feature" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/features#integration", label: "Integration" },
  { href: "/#blog", label: "Blog" },
];

const primaryLinkClass =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all btn-gold px-5 py-2.5 text-sm rounded-full";

export default function Navbar() {
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

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      return pathname === "/" && hash === href.slice(1);
    }
    if (href === "/") {
      return pathname === "/" && !hash;
    }
    if (href.includes("#")) {
      const [path, h] = href.split("#");
      return pathname === path && hash === `#${h}`;
    }
    return pathname === href;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-5 sm:px-6">
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between">
        <Logo />

        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
          <div className="glass-dock flex items-center gap-0.5 px-2 py-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  isActive(link.href)
                    ? "bg-accent-brand/15 text-white border border-accent-brand/30 shadow-[0_0_20px_rgba(255,95,5,0.2)]"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex items-center">
          <Link href="/contact" className={primaryLinkClass}>
            Contact <ArrowRight size={16} />
          </Link>
        </div>

        <button
          type="button"
          className="lg:hidden p-2 text-text-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden mt-4 mx-auto max-w-7xl glass-card p-4"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-accent-brand/15 text-accent-brand"
                      : "text-text-secondary hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-white/10">
                <Link href="/contact" className={cn(primaryLinkClass, "w-full")}>
                  Contact <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
