import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieConsent } from "@/components/compliance/cookie-consent";
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
  title: {
    default: "Property Management Services | Rent or Let Teesside",
    template: "%s | Property Management Services",
  },
  description:
    "Family-run letting agents in Middlesbrough and Teesside. Quality homes, landlord services, and tenant support you can trust.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.rent-or-let.co.uk"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <SiteHeader />
        <main className="min-h-screen">{children}</main>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
