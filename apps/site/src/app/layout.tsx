import type { Metadata } from "next";
import { headers } from "next/headers";
import { Archivo, Geist, Geist_Mono, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { TenantProvider } from "@repo/config";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import { getAgencyBySlug } from "@repo/config/runtime";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieConsent } from "@/components/compliance/cookie-consent";
import { VeriHeader } from "@/veri/header";
import { VeriFooter } from "@/veri/footer";
import { TickObserver, tickBootScript } from "@/veri/tick-observer";
import { TickDefs } from "@/veri/ui";
import { VERI_AGENCY_ID } from "@/lib/veri";
import "./globals.css";
import "./agency-themes.css";
import "../veri/veri.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Veri Properties: one family, using its width axis for hierarchy, plus a mono for money.
const veriSans = Archivo({
  variable: "--font-veri",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const veriMono = IBM_Plex_Mono({
  variable: "--font-veri-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Default agency layout typeface (self-hosted, SIL Open Font License; see src/fonts/OFL.txt).
const agencySans = localFont({
  src: "../fonts/hanken-grotesk-latin-wght.woff2",
  variable: "--font-agency-sans",
  weight: "100 900",
  display: "swap",
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
      default:
        agency.config.name === agency.config.productName
          ? `${agency.config.name} | ${agency.slug === VERI_AGENCY_ID ? "Lettings, itemised" : "Letting agents"}`
          : `${agency.config.name} | ${agency.config.productName}`,
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

  if (agency.slug === VERI_AGENCY_ID) {
    return (
      <html
        lang="en-GB"
        data-agency={agency.slug}
        data-platform-host={agency.runtime.platformHost}
        suppressHydrationWarning
      >
        <body className={`${veriSans.variable} ${veriMono.variable}`}>
          <script dangerouslySetInnerHTML={{ __html: tickBootScript }} />
          <TenantProvider tenant={agency.config}>
            <TickDefs />
            <VeriHeader />
            <main id="main" className="min-h-[60vh]">
              {children}
            </main>
            <VeriFooter />
            <CookieConsent />
            <TickObserver />
          </TenantProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en-GB" data-agency={agency.slug} data-platform-host={agency.runtime.platformHost}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${agencySans.variable} font-sans`}>
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
