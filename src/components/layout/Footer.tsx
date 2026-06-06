import Link from "next/link";
import { Twitter, Linkedin, Instagram } from "lucide-react";
import Logo from "./Logo";

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

const legal = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Disclosures", href: "/disclosures" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50">
      <div className="mx-auto max-w-7xl section-padding">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-text-secondary leading-relaxed">
              Premium digital banking and wealth management for those who demand excellence.
            </p>
            <div className="flex gap-4">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="p-2 rounded-lg bg-white/5 text-text-muted hover:text-accent-brand hover:bg-accent-brand/10 transition-colors" aria-label="Social">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {[{ title: "Products", items: products }, { title: "Company", items: company }, { title: "Legal", items: legal }].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-text-secondary hover:text-accent-brand transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">© {new Date().getFullYear()} Platinum Crest Bank. All rights reserved.</p>
          <p className="text-xs text-text-muted">FDIC Insured | Member FDIC | Equal Housing Lender</p>
        </div>
      </div>
    </footer>
  );
}
