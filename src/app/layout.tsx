import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeO – Metabolic Health AI",
  description: "Your personal metabolic health AI assistant powered by LangGraph and AWS Bedrock.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
