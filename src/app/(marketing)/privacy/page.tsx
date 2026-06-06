import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Platinum Crest Bank",
  description: "How Platinum Crest Bank collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <section className="section-padding pt-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-10">Last updated: June 5, 2026</p>
        <div className="prose prose-invert max-w-none space-y-6 text-text-secondary text-sm leading-relaxed">
          <p>
            Platinum Crest Bank (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
            This policy describes how we collect, use, and safeguard information when you use our website and banking services.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Information We Collect</h2>
          <p>
            We collect information you provide during registration, identity verification, and account use — including name,
            email, phone number, government ID documents for KYC, transaction history, and support communications.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">How We Use Your Information</h2>
          <p>
            We use your data to provide banking services, verify identity, prevent fraud, process transactions,
            communicate with you, and comply with legal obligations.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Data Security</h2>
          <p>
            We employ encryption, access controls, and monitoring consistent with industry standards.
            No method of transmission over the internet is 100% secure, but we continuously improve our safeguards.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Contact</h2>
          <p>
            For privacy questions, contact us at{" "}
            <a href="mailto:privacy@platinumcrest.com" className="text-accent-brand hover:underline">
              privacy@platinumcrest.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
