import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclosures | Blackrock Reserve",
  description: "Regulatory disclosures and important information about Blackrock Reserve.",
};

export default function DisclosuresPage() {
  return (
    <section className="section-padding pt-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Disclosures</h1>
        <p className="text-sm text-text-muted mb-10">Last updated: June 5, 2026</p>
        <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
          <p>
            Blackrock Reserve provides digital banking and investment services subject to applicable federal and state regulations.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">FDIC Insurance</h2>
          <p>
            Deposits may be eligible for FDIC insurance up to applicable limits when held at participating insured institutions.
            Coverage is subject to FDIC rules and conditions.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Investment Risk</h2>
          <p>
            Investments involve risk, including possible loss of principal. Past performance does not guarantee future results.
            Consider your objectives and risk tolerance before investing.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Bitcoin Deposits</h2>
          <p>
            Cryptocurrency deposits are subject to network confirmation times and manual verification.
            Exchange rates and fees may apply at the time of crediting.
          </p>
        </div>
      </div>
    </section>
  );
}
