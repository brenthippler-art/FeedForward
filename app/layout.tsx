import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import SiteHeader, { SiteHeaderFallback } from "@/components/SiteHeader";
import "./globals.css";

// Fonts: downloaded at build time and served from our own server
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://163.192.109.118"),
  title: {
    default: "FeedForward: Route surplus food to its best use",
    template: "%s · FeedForward",
  },
  description:
    "FeedForward helps kitchens route surplus food to its best use: people first, then farms, then compost. AI drafts the listing, verified recipients claim it, and every pound is tracked.",
  applicationName: "FeedForward",
  keywords: [
    "food recovery",
    "food waste",
    "surplus food",
    "food donation",
    "composting",
    "HackTN",
  ],
  authors: [{ name: "Team FeedForward" }],
  creator: "Team FeedForward",
  category: "sustainability",

  // Icons: the files live in app/ and Next.js finds them by name.
  // Listing them here documents what exists; the file names must match exactly.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },

  openGraph: {
    title: "FeedForward",
    description:
      "Route surplus food to people first, then farms, then compost.",
    url: "/",
    siteName: "FeedForward",
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary",
    title: "FeedForward",
    description:
      "Route surplus food to people first, then farms, then compost.",
  },

  // Hackathon prototype with sample data: keep it out of search results
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#24603A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-ground font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-3 focus:font-bold focus:text-white"
        >
          Skip to main content
        </a>
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
