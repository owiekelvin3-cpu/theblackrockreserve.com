import Link from "next/link";
import { Twitter, Linkedin, Instagram } from "lucide-react";
import Logo, { LogoWordmark } from "./Logo";

const products = [
  { label: "Smart Banking", href: "/features#banking" },
  { label: "Investments", href: "/investments" },
  { label: "Wealth Analytics", href: "/features#analytics" },
];

const company = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/about#careers" },
  { label: "Press", href: "/about#press" },
  { label: "Contact", href: "/contact" },
];

const resources = [
  { label: "Blog", href: "/#blog" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

const legal = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Disclosures", href: "/disclosures" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 relative overflow-hidden">
      <div className="mx-auto max-w-7xl section-padding">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 space-y-4">
            <Logo />
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
              Premium digital banking and wealth management for those who demand excellence.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="p-2 rounded-lg bg-white/5 text-text-muted hover:text-accent-brand hover:bg-accent-brand/10 transition-colors"
                  aria-label="Social"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: "Product", items: products },
            { title: "Company", items: company },
            { title: "Resources", items: resources },
            { title: "Legal", items: legal },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-white mb-4 text-sm">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-text-secondary hover:text-accent-brand transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col items-center text-center">
            <LogoWordmark className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl opacity-90" />
            <p className="mt-6 text-sm text-text-muted">
              © {new Date().getFullYear()} Blackrock Reserve. All rights reserved.
            </p>
            <p className="mt-1 text-xs text-text-muted">FDIC Insured | Member FDIC | Equal Housing Lender</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
