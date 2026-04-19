import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0e0b0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    statusBarStyle: "black-translucent",
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
    <html lang="fr" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
