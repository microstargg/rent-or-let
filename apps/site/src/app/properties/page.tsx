import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertyCard } from "@/components/properties/property-card";
import { PageHero } from "@/components/marketing/page-hero";
import { VeriEm, VeriHeading, VeriPanel } from "@/components/marketing/veri-ui";
import { Button } from "@/components/ui/button";
import { tryFetchListings } from "@/lib/platform";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { isAvailableNow, sortListings } from "@/lib/listing";

interface PropertiesPageProps {
  searchParams: Promise<{
    beds?: string;
    maxRent?: string;
    town?: string;
    available?: string;
    sort?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { id, name, site } = await getTenant();
  if (isVeriAgency(id)) {
    return {
      title: "Properties",
      description: `Browse available rental homes with ${name}.`,
    };
  }
  return {
    title: "Properties to let",
    description: site.region
      ? `Browse available rental properties across ${site.region}.`
      : `Browse available rental properties with ${name}.`,
  };
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const { id, site } = await getTenant();
  const isVeri = isVeriAgency(id);
  const params = await searchParams;
  const result = await tryFetchListings({
    minBedrooms: params.beds ? Number(params.beds) : undefined,
    maxRent: params.maxRent ? Number(params.maxRent) : undefined,
    town: params.town,
  });
  const unavailable = result === null;
  const availableOnly = params.available === "now";
  const properties = sortListings(
    (result ?? []).filter((listing) => !availableOnly || isAvailableNow(listing)),
    params.sort
  );
  const hasFilters = Boolean(params.beds || params.maxRent || params.town || availableOnly);

  const emptyCopy = unavailable
    ? "We can't load our listings right now. Please try again shortly, or get in touch and we'll tell you what's available."
    : hasFilters
      ? "No properties match your search. Try widening it, or contact us about upcoming availability."
      : isVeri
        ? "No homes listed yet — email us for upcoming availability."
        : "No properties are listed right now. Please contact us for upcoming availability.";
  const countLabel = unavailable
    ? "Listings unavailable"
    : properties.length === 0
      ? isVeri
        ? "No homes to show"
        : "No properties to show"
      : properties.length === 1
        ? isVeri
          ? "1 home"
          : "1 property"
        : `${properties.length} ${isVeri ? "homes" : "properties"}`;

  if (isVeri) {
    return (
      <>
        <PageHero
          eyebrow="Properties"
          title={
            <>
              Our <em className="font-[family-name:var(--font-veri-serif)] font-normal italic text-[var(--accent)]">homes</em>.
            </>
          }
          subtitle="Browse rentals managed by Veri across the North East. New listings appear here as they go live."
        />

        <section className="border-b border-foreground/10 bg-background">
          <div className="container mx-auto max-w-6xl px-4 py-8 md:py-10">
            <Suspense
              fallback={<div className="h-24 animate-pulse rounded-[1.75rem] bg-muted" />}
            >
              <PropertyFilters />
            </Suspense>
          </div>
        </section>

        <section className="bg-muted/40">
          <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Available now
                </p>
                <VeriHeading as="h2" className="mt-2 text-2xl md:text-3xl">
                  {countLabel}
                </VeriHeading>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/contact">
                  Email the team
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {properties.length === 0 ? (
              <VeriPanel className="px-8 py-16 text-center">
                <VeriHeading as="h3" className="text-xl md:text-2xl">
                  Nothing listed <VeriEm>yet</VeriEm>
                </VeriHeading>
                <p className="mx-auto mt-4 max-w-md text-muted-foreground">{emptyCopy}</p>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="mt-6 inline-block text-sm font-medium text-[oklch(0.45_0.06_55)] hover:underline"
                >
                  {site.contact.email}
                </a>
              </VeriPanel>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#141414] py-16 text-white md:py-20">
          <div className="container mx-auto max-w-6xl px-4 text-center md:text-left">
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-end">
              <div className="max-w-xl">
                <VeriHeading className="text-white">
                  Looking for something <VeriEm>specific</VeriEm>?
                </VeriHeading>
                <p className="mt-4 text-white/65">
                  Tell us what you need and we&apos;ll keep an eye out — fully remote, email-first.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
              >
                <Link href="/contact">
                  Get in touch
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="border-b bg-card">
        <div className="container mx-auto max-w-6xl px-4 pb-8 pt-10 md:pb-10 md:pt-14">
          <h1 className="max-w-[22ch] text-[clamp(2.25rem,4.4vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance">
            {site.region ? `Homes to let in ${site.region}` : "Homes to let"}
          </h1>
          <p className="mt-3 text-[17px] text-muted-foreground">
            Every property we currently let. Enquire online or{" "}
            {site.contact.phone ? "call the office" : "email us"}.
          </p>
        </div>
      </div>

      <div className="z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:sticky md:top-[76px]">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          <Suspense fallback={<div className="h-11 animate-pulse rounded-md bg-muted" />}>
            <PropertyFilters />
          </Suspense>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 pb-16 pt-7 md:pb-20">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold tabular-nums" aria-live="polite">
            {countLabel}
            {hasFilters && !unavailable ? " matching your search" : ""}
          </p>
          {hasFilters && (
            <Link
              href="/properties"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>

        {properties.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center md:p-12">
            <p className="mx-auto max-w-lg text-muted-foreground">{emptyCopy}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {hasFilters && (
                <Button asChild variant="outline" className="h-11">
                  <Link href="/properties">See all properties</Link>
                </Button>
              )}
              <Button asChild className="h-11">
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
