import type { Metadata } from "next";
import Providers from "@/components/providers/Providers";
import "./globals.css";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://platinumcrest.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Platinum Crest Bank | Premium Digital Banking & Investments",
    template: "%s | Platinum Crest Bank",
  },
  description:
    "Premium digital banking, smart investments, and wealth management for high-net-worth individuals and modern investors.",
  keywords: ["banking", "investments", "wealth management", "fintech", "digital bank"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Platinum Crest Bank",
    title: "Platinum Crest Bank | Premium Digital Banking & Investments",
    description:
      "Premium digital banking, smart investments, and wealth management for high-net-worth individuals and modern investors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Platinum Crest Bank",
    description: "Premium digital banking, smart investments, and wealth management.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg-primary font-sans">
        <div className="page-glow" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
