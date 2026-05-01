import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { AnalyticsProvider } from "@/components/layout/analytics-provider";
import { CookieBanner } from "@/components/layout/cookie-banner";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://roboticlawnz.com"),
  title: {
    default: "Robotic Lawnz — Find the right robotic mower for your yard",
    template: "%s · Robotic Lawnz",
  },
  description:
    "Map your lawn, measure your slope, and get a ranked match of robotic mowers that actually fit your yard. Powered by ZippyLawnz.",
  applicationName: "Robotic Lawnz",
  keywords: [
    "robotic mower",
    "robot lawn mower",
    "Husqvarna Automower",
    "Segway Navimow",
    "Mammotion",
    "yard assessment",
    "ZippyLawnz",
  ],
  authors: [{ name: "ZippyLawnz" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    title: "Robotic Lawnz — Find the right robotic mower for your yard",
    description:
      "Map your lawn, measure your slope, and get a ranked match of robotic mowers that fit your yard.",
    siteName: "Robotic Lawnz",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1f6f3e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <div id="app-root" className="min-h-svh">
            {children}
          </div>
          <CookieBanner />
          <AnalyticsProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
