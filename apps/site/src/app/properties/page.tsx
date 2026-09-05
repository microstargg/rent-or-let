import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertyCard } from "@/components/properties/property-card";
import { PageHero } from "@/components/marketing/page-hero";
import { VeriEm, VeriHeading, VeriPanel } from "@/components/marketing/veri-ui";
import { Button } from "@/components/ui/button";
import { fetchListings } from "@/lib/platform";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

interface PropertiesPageProps {
  searchParams: Promise<{
    beds?: string;
    maxRent?: string;
    town?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { id, name } = await getTenant();
  if (isVeriAgency(id)) {
    return {
      title: "Properties",
      description: `Browse available rental homes with ${name}.`,
    };
  }
  return {
    title: "Properties to let",
    description: "Browse available rental properties across Middlesbrough and Teesside.",
  };
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const { id, site } = await getTenant();
  const isVeri = isVeriAgency(id);
  const params = await searchParams;
  const properties = await fetchListings({
    minBedrooms: params.beds ? Number(params.beds) : undefined,
    maxRent: params.maxRent ? Number(params.maxRent) : undefined,
    town: params.town,
  });

  const emptyCopy = isVeri
    ? "No homes listed yet — email us for upcoming availability."
    : "No properties match your search. Please contact us for upcoming availability.";

  if (isVeri) {
    const countLabel =
      properties.length === 0
        ? "No homes to show"
        : properties.length === 1
          ? "1 home"
          : `${properties.length} homes`;

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
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Properties to let</h1>
        <p className="mt-2 text-muted-foreground">
          Quality homes across Middlesbrough and the Teesside area
        </p>
      </div>

      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
        <PropertyFilters />
      </Suspense>

      {properties.length === 0 ? (
        <p className="rounded-xl border bg-muted/30 p-8 text-center text-muted-foreground">
          {emptyCopy}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
