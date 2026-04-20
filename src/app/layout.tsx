import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meo - Your Metabolic Health AI Assistant",
  description: "AI assistant to support metabolic health",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
