import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Blackrock Reserve",
  description: "Terms and conditions for using Blackrock Reserve services.",
};

export default function TermsPage() {
  return (
    <section className="section-padding pt-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Terms of Service</h1>
        <p className="text-sm text-text-muted mb-10">Last updated: June 5, 2026</p>
        <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
          <p>
            By accessing or using Blackrock Reserve, you agree to these Terms of Service.
            If you do not agree, do not use our services.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Eligibility</h2>
          <p>
            You must be at least 18 years old and legally capable of entering a binding agreement to open an account.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Account Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.
            Notify us immediately of unauthorized access.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Acceptable Use</h2>
          <p>
            You may not use our platform for unlawful activity, fraud, money laundering, or any purpose that violates applicable law.
          </p>
          <h2 className="text-lg font-semibold text-white pt-2">Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Blackrock Reserve is not liable for indirect, incidental, or consequential damages
            arising from your use of the service.
          </p>
        </div>
      </div>
    </section>
  );
}
