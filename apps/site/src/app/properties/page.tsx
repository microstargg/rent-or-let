import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertyCard } from "@/components/properties/property-card";
import { PageHero } from "@/components/marketing/page-hero";
import { fetchListings } from "@/lib/platform";
import { getTenant } from "@/lib/tenant";

interface PropertiesPageProps {
  searchParams: Promise<{
    beds?: string;
    maxRent?: string;
    town?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { id, name } = await getTenant();
  if (id === "veri-properties") {
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
  const isVeri = id === "veri-properties";
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
    return (
      <>
        <PageHero
          eyebrow="Properties"
          title="Homes to let"
          subtitle="Browse available rentals managed by Veri. New listings appear here as they go live."
        />
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
            <PropertyFilters />
          </Suspense>

          {properties.length === 0 ? (
            <div className="mt-10 border border-foreground/10 px-8 py-14 text-center">
              <p className="text-muted-foreground">{emptyCopy}</p>
              <Link
                href={`mailto:${site.contact.email}`}
                className="mt-4 inline-block text-sm font-medium text-[oklch(0.45_0.06_55)] hover:underline"
              >
                {site.contact.email}
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
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
