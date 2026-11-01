import Link from "next/link";
import { Suspense } from "react";
import type { PublicListing } from "@repo/site-core";
import type { TenantConfig } from "@repo/config";
import { VeriCard } from "./card";
import { VeriFilters } from "./filters";
import { ActionLink, PageHead } from "./ui";

export function VeriProperties({
  tenant,
  properties,
  unavailable,
  hasFilters,
}: {
  tenant: TenantConfig;
  properties: PublicListing[];
  unavailable: boolean;
  hasFilters: boolean;
}) {
  const email = tenant.site.contact.email;
  const count = properties.length;
  const countLabel = unavailable
    ? "Listings unavailable"
    : `${count} ${count === 1 ? "home" : "homes"}${hasFilters ? " match your search" : " to let"}`;

  return (
    <>
      <PageHead
        title="Homes to let"
        lead="Every home here is let and managed by Veri. Ask a question or book a viewing from any listing, and we'll reply by email."
      />

      <div className="sticky top-[var(--v-head)] z-40 border-b border-[var(--v-line)] bg-[color-mix(in_srgb,var(--v-paper)_94%,transparent)] backdrop-blur-[10px] max-md:static">
        <div className="v-wrap py-3">
          <Suspense fallback={<div className="h-12" />}>
            <VeriFilters />
          </Suspense>
        </div>
      </div>

      <section className="v-wrap pb-24 pt-8">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="v-h3" aria-live="polite">
            {countLabel}
          </h2>
          {hasFilters ? (
            <Link href="/properties" className="v-link font-semibold">
              Clear filters
            </Link>
          ) : null}
        </div>

        {count === 0 ? (
          <div className="max-w-[56ch] border-t-2 border-[var(--v-ink)] pt-6">
            <p className="v-lead">
              {unavailable
                ? "We can't load our listings right now. Please try again shortly."
                : hasFilters
                  ? "Nothing matches that search. Try fewer filters, or tell us what you need."
                  : "Nothing is listed this week. Tell us what you're looking for and we'll email you when something fits."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hasFilters ? (
                <ActionLink href="/properties" variant="ghost">
                  See every home
                </ActionLink>
              ) : null}
              <ActionLink href={`mailto:${email}`} variant="pen">
                Email {email}
              </ActionLink>
            </div>
          </div>
        ) : (
          <div className="grid gap-x-[var(--v-gutter)] gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property, index) => (
              <VeriCard key={property.id} property={property} priority={index < 3} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
