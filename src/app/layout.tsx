import type { Metadata, Viewport } from "next";
import { Bangers, Geist } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Comic display face for titles (h1, h2 in globals.css), the manga design
// system. One weight exists : about 25 KB.
const bangers = Bangers({
  variable: "--font-bangers",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

export const viewport: Viewport = {
  themeColor: "#f6f0e7",
  width: "device-width",
  initialScale: 1, // zoom stays allowed (WCAG 1.4.4) ; inputs are 16px so iOS does not auto-zoom
};

export const metadata: Metadata = {
  title: {
    default: "Yomushelf — Ta collection manga",
    template: "%s | Yomushelf",
  },
  description:
    "Suis ta collection physique de mangas : possession, lecture, budget. Pour les collectionneurs FR.",
  applicationName: "Yomushelf",
  keywords: ["manga", "collection", "bibliothèque", "tome", "lecture"],
  authors: [{ name: "Yomushelf" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yomushelf",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Yomushelf",
    title: "Yomushelf — Ta collection manga",
    description:
      "Suis ta collection physique de mangas : possession, lecture, budget.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yomushelf — Ta collection manga",
    description:
      "Suis ta collection physique de mangas : possession, lecture, budget.",
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
    <html lang="fr" className={`${geistSans.variable} ${bangers.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
