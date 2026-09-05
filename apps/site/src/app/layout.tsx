import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TenantProvider } from "@repo/config";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieConsent } from "@/components/compliance/cookie-consent";
import { getSiteAgency } from "@/lib/agency";
import "./globals.css";
import "./agency-themes.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const agency = await getSiteAgency();
  return {
    title: {
      default: `${agency.config.name} | ${agency.config.productName}`,
      template: `%s | ${agency.config.name}`,
    },
    description: agency.config.site.hero.subtitle,
    metadataBase: new URL(
      agency.runtime.publicSiteUrl ?? agency.config.domain
    ),
    icons: {
      icon: `/agencies/${agency.slug}/icon.svg`,
      apple: `/agencies/${agency.slug}/apple-icon.svg`,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const agency = await getSiteAgency();

  return (
    <html lang="en-GB" data-agency={agency.slug} data-platform-host={agency.runtime.platformHost}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <TenantProvider tenant={agency.config}>
          <SiteHeader />
          <main className="min-h-screen">{children}</main>
          <SiteFooter />
          <CookieConsent />
        </TenantProvider>
      </body>
    </html>
  );
}
