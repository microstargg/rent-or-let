import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertyCard } from "@/components/properties/property-card";
import { VeriProperties } from "@/veri/properties";
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
      title: "Homes to let",
      description: `Rental homes let and managed by ${name}. Rent, deposit and every fee shown up front.`,
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
  const tenant = await getTenant();
  const { id, site } = tenant;
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
      : "No properties are listed right now. Please contact us for upcoming availability.";
  const countLabel = unavailable
    ? "Listings unavailable"
    : properties.length === 0
      ? "No properties to show"
      : properties.length === 1
        ? "1 property"
        : `${properties.length} properties`;

  if (isVeri) {
    return (
      <VeriProperties
        tenant={tenant}
        properties={properties}
        unavailable={unavailable}
        hasFilters={hasFilters}
      />
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
