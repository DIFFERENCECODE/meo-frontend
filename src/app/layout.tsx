import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageContext";
import "./globals.css";

// Cabinet Grotesk is the primary face shared with the marketing
// landing page (shop.meterbolic.com) so brand typography is
// consistent across web app + landing + iOS/Android apps. Loaded
// from Fontshare via a <link> in <head> below; Geist stays as a
// fallback in case Fontshare is unreachable.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase tells Next.js how to resolve relative URLs in
  // OG images, canonicals, etc. Without it, OpenGraph URLs resolve
  // to localhost in production builds.
  metadataBase: new URL("https://app.meterbolic.com"),
  title: {
    // `%s` is replaced by the per-page title; the default is used on
    // pages that don't set their own (landing, chat).
    default: "MeO — AI assistant for metabolic health | Meterbolic",
    template: "%s | MeO",
  },
  description:
    "MeO is your personal AI companion for metabolic health. Understand your Kraft insulin curve, biological age score, and visceral fat — with evidence-based guidance on nutrition, movement, and sleep.",
  applicationName: "MeO",
  keywords: [
    "metabolic health",
    "biological age",
    "Kraft test",
    "insulin resistance",
    "HOMA-IR",
    "METS-IR",
    "visceral fat",
    "AI health assistant",
    "Meterbolic",
    "metabolic score",
    "glucose monitoring",
    "personalised nutrition",
  ],
  authors: [{ name: "Meterbolic", url: "https://meterbolic.com" }],
  creator: "Meterbolic Ltd",
  publisher: "Meterbolic Ltd",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  // Tell search engines this is the canonical origin. Also let
  // language-alternate crawlers know we serve the same content under
  // multiple UI languages (content itself is client-translated, but
  // the signal helps search engines surface in each locale).
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ar: "/",
      hi: "/",
      nl: "/",
    },
  },
  openGraph: {
    type: "website",
    url: "https://app.meterbolic.com",
    siteName: "MeO by Meterbolic",
    title: "MeO — AI assistant for metabolic health",
    description:
      "Your personal AI companion for metabolic health. Understand your Kraft curve, biological age, and visceral fat — with evidence-based guidance.",
    locale: "en_US",
    alternateLocale: ["ar_AR", "hi_IN", "nl_NL"],
    // Images auto-resolved by Next from app/opengraph-image.tsx —
    // dynamic ImageResponse at /opengraph-image. No manual URL needed.
  },
  twitter: {
    card: "summary_large_image",
    title: "MeO — AI assistant for metabolic health",
    description:
      "Your personal AI companion for metabolic health. Understand your Kraft curve, biological age, and visceral fat.",
    creator: "@meterbolic",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  category: "health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Cabinet Grotesk — Fontshare CDN. Preconnect first so the
            TLS handshake is paid for once, then the stylesheet
            request is fast. Mirrors the marketing landing page's
            font setup for cross-property typographic consistency. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&display=swap"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, padding: 0, height: "100vh" }}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <LanguageProvider>
          {children}
          </LanguageProvider>
          {/* Global toast host. Sonner renders its own portal; mounting
              once at the root is enough — any call to toast.*() from
              anywhere in the tree shows up here. Dark theme matches the
              app, top-right position keeps it clear of the chat input. */}
          {/* Bottom-right on desktop — keeps toasts out of the chat
              flow where the right panel toggle also lives. On narrow
              screens sonner auto-repositions to top so they don't
              collide with the mobile input bar at the bottom. */}
          <Toaster
            position="bottom-right"
            mobileOffset={{ top: 16, right: 16 }}
            theme="dark"
            richColors
            closeButton
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
