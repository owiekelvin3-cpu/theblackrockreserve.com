import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Blackrock Reserve",
  description: "How Blackrock Reserve uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <section className="section-padding pt-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Cookie Policy</h1>
        <p className="text-sm text-text-muted mb-10">Last updated: June 5, 2026</p>
        <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
          <p>
            We use cookies and similar technologies to operate the site, keep you signed in, remember preferences,
            and understand how our services are used.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Essential Cookies</h2>
          <p>
            Required for authentication, security, and core banking functionality. These cannot be disabled while using the platform.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Analytics Cookies</h2>
          <p>
            Help us measure traffic and improve performance. We use aggregated, anonymized data where possible.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Disabling essential cookies may limit account access and features.
          </p>
        </div>
      </div>
    </section>
  );
}
