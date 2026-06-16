import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Home, MapPin, Search } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Button } from "@/components/ui/button";
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Tenant services",
  description:
    "Find quality rental homes across Teesside with advice, support and transparent fees from Property Management Services.",
};

export default function TenantsPage() {
  const { tenants } = siteContent;

  return (
    <>
      <PageHero
        eyebrow={tenants.hero.eyebrow}
        title={tenants.hero.title}
        subtitle={tenants.hero.subtitle}
      />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <FeatureGrid
          items={tenants.trustPoints.map((point) => ({
            title: point.title,
            description: point.description,
          }))}
        />
      </section>

      <section className="bg-muted/40 py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-bold">We are here for you</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {tenants.intro}
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                {tenants.benefits}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold">Start your search</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse our available properties or call our office to arrange a
                viewing.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/properties">
                    View properties
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/apply">Apply to rent</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-2 text-primary">
              <MapPin className="h-5 w-5" />
              <h2 className="text-xl font-bold">{tenants.choosingArea.title}</h2>
            </div>
            <p className="text-muted-foreground">{tenants.choosingArea.intro}</p>
            <ul className="mt-4 space-y-2">
              {tenants.choosingArea.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Search className="h-5 w-5" />
              <h2 className="text-xl font-bold">{tenants.findingProperty.title}</h2>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {tenants.findingProperty.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">{tenants.securingProperty.title}</h2>
          <p className="mt-2 text-muted-foreground">
            Once you have found a suitable property, the following process applies.
          </p>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {tenants.securingProperty.steps.map((step, index) => (
              <li
                key={step.title}
                className="relative rounded-xl border bg-card p-6 shadow-sm"
              >
                <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">Permitted payments</h2>
        <p className="mt-2 text-muted-foreground">
          Under the Tenant Fees Act 2019, the following payments may be requested
          during your tenancy.
        </p>
        <ul className="mt-6 space-y-2">
          {tenants.permittedPayments.map((payment) => (
            <li
              key={payment}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {payment}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <a
            href={siteContent.fees.permittedPaymentsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Read the government How to Rent guide →
          </a>
        </p>
      </section>

      <TrustStrip />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Home className="h-5 w-5" />
              <h2 className="text-xl font-bold">{tenants.livingInHome.title}</h2>
            </div>
            <p className="text-muted-foreground">{tenants.livingInHome.intro}</p>
            <div className="mt-6 space-y-4">
              {tenants.livingInHome.points.map((point) => (
                <div key={point.title} className="rounded-lg border bg-card p-4">
                  <h3 className="font-medium">{point.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">{tenants.responsibilities.title}</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {tenants.responsibilities.intro}
            </p>
            <ul className="mt-4 space-y-2">
              {tenants.responsibilities.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {tenants.responsibilities.outro}
            </p>
            <p className="mt-4 text-sm text-muted-foreground italic">
              {tenants.confidentiality}
            </p>
          </div>
        </div>
      </section>

      <CtaBanner
        title="Ready to find your next home?"
        description="Browse our available properties across Middlesbrough and Teesside, or apply online today."
        primaryHref="/properties"
        primaryLabel="View properties"
        secondaryHref="/apply"
        secondaryLabel="Apply to rent"
      />
    </>
  );
}
