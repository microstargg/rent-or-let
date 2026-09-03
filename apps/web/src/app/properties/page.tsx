import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyFilters } from "@/components/properties/property-filters";
import { PropertyCard } from "@/components/properties/property-card";
import { getAvailableProperties } from "@/lib/data/properties";

export const metadata: Metadata = {
  title: "Properties to let",
  description: "Browse available rental properties across Middlesbrough and Teesside.",
};

interface PropertiesPageProps {
  searchParams: Promise<{
    beds?: string;
    maxRent?: string;
    town?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = await searchParams;
  const properties = await getAvailableProperties({
    minBedrooms: params.beds ? Number(params.beds) : undefined,
    maxRent: params.maxRent ? Number(params.maxRent) : undefined,
    town: params.town,
  });

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
          No properties match your search. Please contact us for upcoming availability.
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
