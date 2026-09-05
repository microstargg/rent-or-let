import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Home, MapPin, Search } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { VeriEm, VeriHeading, VeriPanel } from "@/components/marketing/veri-ui";
import { Button } from "@/components/ui/button";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getTenant();
  return {
    title: "Tenant services",
    description: `Find quality rental homes with advice, support and transparent fees from ${name}.`,
  };
}

export default async function TenantsPage() {
  const { site: siteContent, id } = await getTenant();
  const { tenants } = siteContent;
  const isVeri = isVeriAgency(id);
  const accentDot = isVeri ? "bg-[var(--accent)]" : "bg-primary";
  const accentIcon = isVeri ? "text-[oklch(0.55_0.08_55)]" : "text-primary";

  return (
    <>
      <PageHero
        eyebrow={tenants.hero.eyebrow}
        title={tenants.hero.title}
        subtitle={tenants.hero.subtitle}
      />

      <section className="container mx-auto max-w-6xl px-4 py-14 md:py-16">
        <FeatureGrid
          items={tenants.trustPoints.map((point) => ({
            title: point.title,
            description: point.description,
          }))}
        />
      </section>

      <section className={cn(isVeri ? "bg-[#141414] text-white" : "bg-muted/40", "py-14 md:py-16")}>
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              {isVeri ? (
                <VeriHeading className="text-white">
                  We are here for <VeriEm>you</VeriEm>
                </VeriHeading>
              ) : (
                <h2 className="text-2xl font-bold">We are here for you</h2>
              )}
              <p
                className={cn(
                  "mt-4 leading-relaxed",
                  isVeri ? "text-white/70" : "text-muted-foreground"
                )}
              >
                {tenants.intro}
              </p>
              <p
                className={cn(
                  "mt-4 leading-relaxed",
                  isVeri ? "text-white/70" : "text-muted-foreground"
                )}
              >
                {tenants.benefits}
              </p>
            </div>
            <div
              className={
                isVeri
                  ? "rounded-[1.75rem] border border-white/15 bg-white/5 p-6 md:p-8"
                  : "rounded-xl border bg-card p-6 shadow-sm"
              }
            >
              <h3 className={cn("font-semibold", isVeri && "font-[family-name:var(--font-veri-sans)]")}>
                Start your search
              </h3>
              <p className={cn("mt-2 text-sm", isVeri ? "text-white/60" : "text-muted-foreground")}>
                {isVeri
                  ? "Browse our available properties or email the team to arrange a viewing."
                  : "Browse our available properties or call our office to arrange a viewing."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  asChild
                  className={
                    isVeri
                      ? "rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
                      : undefined
                  }
                >
                  <Link href="/properties">
                    View properties
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className={
                    isVeri
                      ? "rounded-full border-white/25 bg-transparent text-white hover:bg-white/10"
                      : undefined
                  }
                >
                  <Link href="/apply">Apply to rent</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className={cn("mb-4 flex items-center gap-2", accentIcon)}>
              <MapPin className="h-5 w-5" />
              <h2 className={cn("text-xl font-bold", isVeri && "font-[family-name:var(--font-veri-sans)]")}>
                {tenants.choosingArea.title}
              </h2>
            </div>
            <p className="text-muted-foreground">{tenants.choosingArea.intro}</p>
            <ul className="mt-4 space-y-2">
              {tenants.choosingArea.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", accentIcon)} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className={cn("mb-4 flex items-center gap-2", accentIcon)}>
              <Search className="h-5 w-5" />
              <h2 className={cn("text-xl font-bold", isVeri && "font-[family-name:var(--font-veri-sans)]")}>
                {tenants.findingProperty.title}
              </h2>
            </div>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              {tenants.findingProperty.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={cn(isVeri ? "bg-muted/50" : "bg-muted/40", "py-14 md:py-16")}>
        <div className="container mx-auto max-w-6xl px-4">
          {isVeri ? (
            <VeriHeading>
              Securing your new <VeriEm>home</VeriEm>
            </VeriHeading>
          ) : (
            <h2 className="text-2xl font-bold">{tenants.securingProperty.title}</h2>
          )}
          <p className="mt-2 text-muted-foreground">
            Once you have found a suitable property, the following process applies.
          </p>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {tenants.securingProperty.steps.map((step, index) => (
              <li
                key={step.title}
                className={
                  isVeri
                    ? "rounded-[1.75rem] border border-foreground/10 bg-background p-6"
                    : "relative rounded-xl border bg-card p-6 shadow-sm"
                }
              >
                <span
                  className={cn(
                    "mb-4 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    isVeri
                      ? "bg-[var(--accent)] text-[oklch(0.2_0.02_50)]"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14 md:py-16">
        <h2 className={cn("text-2xl font-bold", isVeri && "font-[family-name:var(--font-veri-sans)]")}>
          Permitted payments
        </h2>
        <p className="mt-2 text-muted-foreground">
          Under the Tenant Fees Act 2019, the following payments may be requested during your
          tenancy.
        </p>
        <ul className="mt-6 space-y-2">
          {tenants.permittedPayments.map((payment) => (
            <li key={payment} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", accentDot)} />
              {payment}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <a
            href={siteContent.fees.permittedPaymentsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(isVeri ? "text-[oklch(0.45_0.06_55)]" : "text-primary", "hover:underline")}
          >
            Read the government How to Rent guide →
          </a>
        </p>
      </section>

      <TrustStrip />

      <section className="container mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className={cn("mb-4 flex items-center gap-2", accentIcon)}>
              <Home className="h-5 w-5" />
              <h2 className={cn("text-xl font-bold", isVeri && "font-[family-name:var(--font-veri-sans)]")}>
                {tenants.livingInHome.title}
              </h2>
            </div>
            <p className="text-muted-foreground">{tenants.livingInHome.intro}</p>
            <div className="mt-6 space-y-4">
              {tenants.livingInHome.points.map((point) =>
                isVeri ? (
                  <VeriPanel key={point.title} className="p-5">
                    <h3 className="font-medium">{point.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
                  </VeriPanel>
                ) : (
                  <div key={point.title} className="rounded-lg border bg-card p-4">
                    <h3 className="font-medium">{point.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{point.description}</p>
                  </div>
                )
              )}
            </div>
          </div>
          <div>
            <h2 className={cn("text-xl font-bold", isVeri && "font-[family-name:var(--font-veri-sans)]")}>
              {tenants.responsibilities.title}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{tenants.responsibilities.intro}</p>
            <ul className="mt-4 space-y-2">
              {tenants.responsibilities.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", accentIcon)} />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {tenants.responsibilities.outro}
            </p>
            <p className="mt-4 text-sm italic text-muted-foreground">{tenants.confidentiality}</p>
          </div>
        </div>
      </section>

      <CtaBanner
        title="Ready to find your next home?"
        description={
          isVeri
            ? "Browse available homes or apply online — email us anytime with questions."
            : "Browse our available properties across Middlesbrough and Teesside, or apply online today."
        }
        primaryHref="/properties"
        primaryLabel="View properties"
        secondaryHref="/apply"
        secondaryLabel="Apply to rent"
      />
    </>
  );
}
