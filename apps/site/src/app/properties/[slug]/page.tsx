import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, ExternalLink, Home, Zap } from "lucide-react";
import { fetchListing } from "@/lib/platform";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { Button } from "@/components/ui/button";
import { PropertyEnquiryForm } from "@/components/properties/property-enquiry-form";
import { FeesDisclosure } from "@/components/compliance/fees-disclosure";
import { ListingPhotos } from "@/components/properties/listing-photos";
import { VeriListing } from "@/veri/listing";
import { availabilityLabel, furnishedLabel, isAvailableNow, primaryFirstImages } from "@/lib/listing";

interface PropertyDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await fetchListing(slug);
  if (!property) return { title: "Property not found" };
  return {
    title: property.displayAddress,
    description: property.summary ?? property.description.slice(0, 160),
  };
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { slug } = await params;
  const property = await fetchListing(slug);
  if (!property) notFound();
  const tenant = await getTenant();
  const { site: siteContent, id } = tenant;
  const isVeri = isVeriAgency(id);

  if (isVeri) {
    return <VeriListing tenant={tenant} property={property} />;
  }

  const phone = siteContent.contact.phone;
  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : null;
  const applyHref = `/apply?property=${encodeURIComponent(property.id)}`;
  const furnished = furnishedLabel(property.furnished);
  const availableNow = isAvailableNow(property);
  const keyFacts = [
    { label: "Bedrooms", value: String(property.bedrooms) },
    { label: "Available", value: availableNow ? "Now" : formatDate(property.availableFrom) },
    { label: "Deposit", value: formatCurrency(property.deposit) },
    furnished
      ? { label: "Furnishing", value: furnished }
      : { label: "Bathrooms", value: String(property.bathrooms) },
  ];
  const details = [
    { icon: Bath, text: `${property.bathrooms} ${property.bathrooms === 1 ? "bathroom" : "bathrooms"}` },
    ...(property.propertyType ? [{ icon: Home, text: property.propertyType.replace(/[_-]/g, " ") }] : []),
    ...(property.epcRating ? [{ icon: Zap, text: `EPC rating ${property.epcRating}` }] : []),
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-20 md:pt-8">
      <Link
        href="/properties"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All homes to let
      </Link>

      <ListingPhotos images={primaryFirstImages(property)} displayAddress={property.displayAddress} />

      <div className="mt-6 grid gap-10 md:mt-9 lg:grid-cols-[8fr_4fr] lg:gap-12">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <span
              aria-hidden
              className={cn("h-2 w-2 rounded-full", availableNow ? "bg-[var(--success)]" : "bg-accent")}
            />
            {availabilityLabel(property)}
          </p>
          <h1 className="mt-2 text-[clamp(1.875rem,3.6vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance">
            {property.displayAddress}
          </h1>
          <p className="mt-3 text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
            {formatCurrency(property.pricePcm)}
            <span className="ml-2 text-base font-medium tracking-normal text-muted-foreground">
              per calendar month
            </span>
          </p>

          <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-4">
            {keyFacts.map(({ label, value }, index) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col-reverse px-4 py-3.5",
                  index % 2 === 1 && "border-l",
                  index >= 2 && "border-t sm:border-t-0",
                  index === 2 && "sm:border-l"
                )}
              >
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="text-[17px] font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm capitalize text-muted-foreground">
            {details.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5">
                <Icon aria-hidden className="h-4 w-4" />
                {text}
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-[64ch] whitespace-pre-wrap text-[17px] leading-relaxed text-foreground/85">
            {property.description}
          </p>

          {property.features.length > 0 && (
            <>
              <h2 className="mt-9 text-2xl font-bold tracking-[-0.02em]">Features</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {property.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </>
          )}

          <FeesDisclosure
            rent={property.pricePcm}
            deposit={property.deposit}
            holdingDeposit={property.holdingDeposit}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            {property.epcUrl && (
              <Button asChild variant="outline" size="sm" className="bg-card">
                <a href={property.epcUrl} target="_blank" rel="noopener noreferrer">
                  View EPC <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="bg-card">
              <a href={siteContent.fees.permittedPaymentsUrl} target="_blank" rel="noopener noreferrer">
                How to Rent guide <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        <div id="enquire" className="scroll-mt-28">
          <div className="sticky top-28 rounded-xl border bg-card p-6">
            <h2 className="text-xl font-bold">Interested in this home?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask a question or book a viewing. Deposit {formatCurrency(property.deposit)}.
            </p>
            <PropertyEnquiryForm propertyId={property.id} />
            <Button asChild variant="outline" className="mt-2 h-11 w-full">
              <Link href={applyHref}>Apply to rent this home</Link>
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {tel ? (
                <>
                  Or call{" "}
                  <a href={tel} className="font-semibold text-primary tabular-nums">
                    {phone}
                  </a>
                </>
              ) : (
                <>
                  Or email{" "}
                  <a href={`mailto:${siteContent.contact.email}`} className="font-semibold text-primary">
                    {siteContent.contact.email}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Phones: the actions stay in reach while reading. */}
      <div data-action-bar className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        {tel ? (
          <Button asChild variant="outline" className="h-12 flex-1">
            <a href={tel}>Call</a>
          </Button>
        ) : null}
        <Button asChild className="h-12 flex-1">
          <a href="#enquire">Enquire</a>
        </Button>
        <Button asChild variant="outline" className="h-12 flex-1">
          <Link href={applyHref}>Apply</Link>
        </Button>
      </div>
    </div>
  );
}
