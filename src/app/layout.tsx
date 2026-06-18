import type { Metadata, Viewport } from "next";
import Providers from "@/components/providers/Providers";
import { getSiteUrl } from "@/lib/site-url";
import { getLocaleDir, getServerLocale } from "@/lib/i18n/server";
import "./globals.css";

const siteUrl = getSiteUrl();

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('br-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
  try {
    var loc = localStorage.getItem('br-locale');
    if (!loc) {
      var m = document.cookie.match(/(?:^|; )br-locale=([^;]*)/);
      if (m) loc = decodeURIComponent(m[1]);
    }
    if (loc) {
      document.documentElement.lang = loc;
      document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
    }
  } catch (e) {}
})();
`;

const splashDismissScript = `
(function() {
  var standalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator.standalone === true);
  if (!standalone) {
    document.documentElement.classList.add('app-ready');
    var el = document.getElementById('app-splash');
    if (el) el.remove();
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BlackrockReserve",
    template: "%s | BlackrockReserve",
  },
  description:
    "Premium digital banking, smart investments, and wealth management for high-net-worth individuals and modern investors.",
  keywords: ["banking", "investments", "wealth management", "fintech", "digital bank"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "BlackrockReserve",
    title: "BlackrockReserve",
    description:
      "Premium digital banking, smart investments, and wealth management for high-net-worth individuals and modern investors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlackrockReserve",
    description: "Premium digital banking, smart investments, and wealth management.",
  },
  robots: {
    index: true,
    follow: true,
  },
  applicationName: "BlackrockReserve",
  appleWebApp: {
    capable: true,
    title: "BlackrockReserve",
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#FF6B1A" },
    { media: "(prefers-color-scheme: light)", color: "#FF6B1A" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getServerLocale();
  const dir = getLocaleDir(initialLocale);

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: splashDismissScript }} />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
      </head>
      <body className="antialiased bg-bg-primary font-sans">
        <div id="app-splash" suppressHydrationWarning aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon.svg"
            alt=""
            width={88}
            height={88}
            className="app-splash-icon"
          />
          <p className="app-splash-name">BlackrockReserve</p>
          <div className="app-splash-loader" role="presentation">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="page-glow" />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
