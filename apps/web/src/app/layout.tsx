import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TenantProvider } from "@repo/config";
import { CookieConsent } from "@/components/compliance/cookie-consent";
import { bindRequestAgency } from "@/lib/agency";
import { getAppUrl } from "@/lib/app-url";
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
  const agency = await bindRequestAgency();
  const { config } = agency;
  return {
    title: {
      default: `${config.name} | LetFlow`,
      template: `%s | ${config.name}`,
    },
    description: `${config.name} operations on LetFlow`,
    metadataBase: new URL(getAppUrl()),
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
  const agency = await bindRequestAgency();

  return (
    <html lang="en-GB" data-agency={agency.slug} data-platform-host={agency.runtime.platformHost}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <TenantProvider tenant={agency.config}>
          <main className="min-h-screen">{children}</main>
          <CookieConsent />
        </TenantProvider>
      </body>
    </html>
  );
}
