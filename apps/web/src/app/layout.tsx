import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getTenant } from "@repo/config";
import { TenantProvider } from "@repo/config";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieConsent } from "@/components/compliance/cookie-consent";
import "./globals.css";
import "./tenant-theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tenant = getTenant();

export const metadata: Metadata = {
  title: {
    default: `${tenant.name} | ${tenant.productName}`,
    template: `%s | ${tenant.name}`,
  },
  description: tenant.site.hero.subtitle,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? tenant.domain
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
        <TenantProvider tenant={tenant}>
          <SiteHeader />
          <main className="min-h-screen">{children}</main>
          <SiteFooter />
          <CookieConsent />
        </TenantProvider>
      </body>
    </html>
  );
}
