import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Instrument_Serif, Outfit } from "next/font/google";
import { TenantProvider } from "@repo/config";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import { getAgencyBySlug } from "@repo/config/runtime";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieConsent } from "@/components/compliance/cookie-consent";
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

const veriSans = Outfit({
  variable: "--font-veri-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const veriSerif = Instrument_Serif({
  variable: "--font-veri-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const previewMetadata: Metadata = {
  title: "LetFlow sites",
  description: "Choose an agency website to preview.",
};

export async function generateMetadata(): Promise<Metadata> {
  const slug = (await headers()).get(AGENCY_SLUG_HEADER);
  if (!slug) return previewMetadata;
  const agency = getAgencyBySlug(slug);
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
  const slug = (await headers()).get(AGENCY_SLUG_HEADER);
  if (!slug) {
    return (
      <html lang="en-GB">
        <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
          {children}
        </body>
      </html>
    );
  }

  const agency = getAgencyBySlug(slug);
  const isVeri = agency.slug === "veri-properties";
  const fontVars = isVeri
    ? `${veriSans.variable} ${veriSerif.variable} ${geistMono.variable}`
    : `${geistSans.variable} ${geistMono.variable}`;

  return (
    <html lang="en-GB" data-agency={agency.slug} data-platform-host={agency.runtime.platformHost}>
      <body
        className={`${fontVars} font-sans ${isVeri ? "font-[family-name:var(--font-veri-sans)]" : ""}`}
      >
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
