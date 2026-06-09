import type { Metadata } from "next";
import Providers from "@/components/providers/Providers";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Blackrock Reserve | Premium Digital Banking & Investments",
    template: "%s | Blackrock Reserve",
  },
  description:
    "Premium digital banking, smart investments, and wealth management for high-net-worth individuals and modern investors.",
  keywords: ["banking", "investments", "wealth management", "fintech", "digital bank"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Blackrock Reserve",
    title: "Blackrock Reserve | Premium Digital Banking & Investments",
    description:
      "Premium digital banking, smart investments, and wealth management for high-net-worth individuals and modern investors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blackrock Reserve",
    description: "Premium digital banking, smart investments, and wealth management.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
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
