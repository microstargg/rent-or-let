import Link from "next/link";
import type { PublicListing } from "@repo/site-core";
import type { TenantConfig } from "@repo/config";
import { PropertyEnquiryForm } from "@/components/properties/property-enquiry-form";
import { ListingPhotos } from "@/components/properties/listing-photos";
import { FeesDisclosure } from "@/components/compliance/fees-disclosure";
import { formatCurrency, formatDate } from "@/lib/utils";
import { availabilityLabel, furnishedLabel, isAvailableNow, primaryFirstImages } from "@/lib/listing";
import { ActionLink, Line, Tick, TickList } from "./ui";

export function VeriListing({ tenant, property }: { tenant: TenantConfig; property: PublicListing }) {
  const { site } = tenant;
  const applyHref = `/apply?property=${encodeURIComponent(property.id)}`;
  const availableNow = isAvailableNow(property);
  const furnished = furnishedLabel(property.furnished);
  const type = property.propertyType ? property.propertyType.replace(/[_-]/g, " ") : null;

  const facts: Array<{ label: string; amount: string }> = [
    { label: "Rent", amount: `${formatCurrency(property.pricePcm)} pcm` },
    { label: "Deposit", amount: formatCurrency(property.deposit) },
    ...(property.holdingDeposit
      ? [{ label: "Holding deposit", amount: formatCurrency(property.holdingDeposit) }]
      : []),
    { label: "Available", amount: availableNow ? "Now" : formatDate(property.availableFrom) },
    { label: "Bedrooms", amount: String(property.bedrooms) },
    { label: "Bathrooms", amount: String(property.bathrooms) },
    ...(furnished ? [{ label: "Furnishing", amount: furnished }] : []),
    ...(type ? [{ label: "Property type", amount: type.charAt(0).toUpperCase() + type.slice(1) }] : []),
    ...(property.epcRating ? [{ label: "Energy rating", amount: `EPC ${property.epcRating}` }] : []),
  ];

  return (
    <div className="v-wrap pb-32 pt-6 md:pt-8 lg:pb-24">
      <Link href="/properties" className="v-link mb-5 inline-block font-semibold">
        All homes to let
      </Link>

      <ListingPhotos images={primaryFirstImages(property)} displayAddress={property.displayAddress} />

      <div className="v-grid mt-10 gap-y-12">
        <div className="col-span-12 min-w-0 lg:col-span-7">
          <p className="inline-flex items-center gap-2 font-semibold">
            {availableNow ? <Tick drawn /> : null}
            {availabilityLabel(property)}
          </p>
          <h1 className="mt-3 text-[clamp(2rem,1rem+3.6vw,3.75rem)] font-[800] leading-[0.95] tracking-[-0.04em] [font-stretch:120%] [text-wrap:balance]">
            {property.displayAddress}
          </h1>
          <p className="v-num mt-5 text-[clamp(2.25rem,1.6rem+2vw,3.25rem)] font-medium leading-none">
            {formatCurrency(property.pricePcm)}
            <span className="ml-2 font-[family-name:var(--font-veri)] text-base font-medium tracking-normal text-[var(--v-muted)]">
              per calendar month
            </span>
          </p>

          <div className="v-statement mt-10" data-tick>
            <h2 className="v-statement__title">
              <span>The facts</span>
            </h2>
            <ul>
              {facts.map((fact, index) => (
                <Line key={fact.label} i={index} label={fact.label} amount={fact.amount} />
              ))}
            </ul>
          </div>

          <h2 className="v-h3 mt-14">About this home</h2>
          <p className="mt-4 max-w-[64ch] whitespace-pre-wrap text-[var(--v-muted)]">{property.description}</p>

          {property.features.length > 0 ? (
            <>
              <h2 className="v-h3 mt-12">Features</h2>
              <TickList className="mt-4 sm:grid-cols-2 sm:gap-x-[var(--v-gutter)]" items={property.features} />
            </>
          ) : null}

          <FeesDisclosure rent={property.pricePcm} deposit={property.deposit} holdingDeposit={property.holdingDeposit} />

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-semibold [&_a]:inline-block [&_a]:py-1">
            {property.epcUrl ? (
              <li>
                <a href={property.epcUrl} target="_blank" rel="noopener noreferrer" className="v-link">
                  View the EPC (opens in a new tab)
                </a>
              </li>
            ) : null}
            <li>
              <a href={site.fees.permittedPaymentsUrl} target="_blank" rel="noopener noreferrer" className="v-link">
                How to Rent guide (opens in a new tab)
              </a>
            </li>
          </ul>
        </div>

        <aside id="enquire" className="col-span-12 lg:col-span-4 lg:col-start-9" aria-labelledby="enquire-title">
          <div className="border-t-2 border-[var(--v-ink)] bg-[var(--v-white)] p-6 lg:sticky lg:top-[calc(var(--v-head)+1.5rem)]">
            <h2 id="enquire-title" className="v-h3">
              Ask about this home
            </h2>
            <p className="mt-2 text-[0.95rem] text-[var(--v-muted)]">
              Ask a question or book a viewing, and we will reply by email.
            </p>
            <PropertyEnquiryForm propertyId={property.id} />
            <div className="mt-3">
              <ActionLink href={applyHref} variant="ghost" className="w-full">
                Apply to rent this home
              </ActionLink>
            </div>
            <p className="mt-5 text-center text-[0.95rem] text-[var(--v-muted)]">
              Or email{" "}
              <a href={`mailto:${site.contact.email}`} className="v-link font-semibold text-[var(--v-ink)]">
                {site.contact.email}
              </a>
            </p>
          </div>
        </aside>
      </div>

      {/* Phones: keep the two actions in reach while reading. */}
      <div
        data-action-bar
        className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-[var(--v-line)] bg-[var(--v-paper)] px-4 py-3 lg:hidden"
      >
        <a href="#enquire" className="v-btn v-btn--pen flex-1">
          Ask about it
        </a>
        <Link href={applyHref} className="v-btn v-btn--ghost flex-1">
          Apply
        </Link>
      </div>
    </div>
  );
}
