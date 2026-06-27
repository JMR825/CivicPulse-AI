import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import { Providers } from "./providers";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CivicPulse AI — Civic Crisis Reporting & Resolution",
  description: "A production-ready platform for citizen reporting, duplicate merging, AI routing, and municipal crisis alert broadcasting.",
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-brand-bg text-gray-100 font-sans selection:bg-brand-primary/30 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
