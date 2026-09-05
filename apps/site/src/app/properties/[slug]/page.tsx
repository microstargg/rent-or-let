import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bed, Bath, Calendar, ExternalLink } from "lucide-react";
import { fetchListing } from "@/lib/platform";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { Button } from "@/components/ui/button";
import { PropertyEnquiryForm } from "@/components/properties/property-enquiry-form";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { FeesDisclosure } from "@/components/compliance/fees-disclosure";

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
  const { site: siteContent, id } = await getTenant();
  const isVeri = isVeriAgency(id);

  return (
    <div
      className={cn(
        "container mx-auto max-w-6xl px-4 py-12",
        isVeri && "pt-28 md:pt-32"
      )}
    >
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className={isVeri ? "overflow-hidden rounded-[1.75rem]" : undefined}>
            <PropertyGallery
              images={property.images}
              displayAddress={property.displayAddress}
            />
          </div>

          <div className="mt-8">
            <p
              className={cn(
                "text-3xl font-bold",
                isVeri
                  ? "font-[family-name:var(--font-veri-sans)] tracking-tight text-foreground"
                  : "text-primary"
              )}
            >
              {formatCurrency(property.pricePcm)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                per calendar month
              </span>
            </p>
            <h1
              className={cn(
                "mt-2 text-2xl font-bold md:text-3xl",
                isVeri && "font-[family-name:var(--font-veri-sans)] tracking-tight"
              )}
            >
              {property.displayAddress}
            </h1>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4" /> {property.bedrooms} bedrooms
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4" /> {property.bathrooms} bathrooms
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Available from{" "}
                {formatDate(property.availableFrom)}
              </span>
            </div>

            <div className="mt-6 prose prose-neutral max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {property.description}
              </p>
            </div>

            {property.features.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {property.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isVeri ? "bg-[var(--accent)]" : "bg-primary"
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <FeesDisclosure
              rent={property.pricePcm}
              deposit={property.deposit}
              holdingDeposit={property.holdingDeposit}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              {property.epcUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={isVeri ? "rounded-full" : undefined}
                >
                  <a href={property.epcUrl} target="_blank" rel="noopener noreferrer">
                    View EPC <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button
                asChild
                variant="outline"
                size="sm"
                className={isVeri ? "rounded-full" : undefined}
              >
                <a
                  href={siteContent.fees.permittedPaymentsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  How to Rent guide <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div
            className={
              isVeri
                ? "sticky top-28 rounded-[1.75rem] border border-foreground/10 bg-card/60 p-6 md:p-7"
                : "sticky top-24 rounded-xl border bg-card p-6 shadow-sm"
            }
          >
            <h2
              className={cn(
                "text-lg font-semibold",
                isVeri && "font-[family-name:var(--font-veri-sans)]"
              )}
            >
              Enquire about this property
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deposit: {formatCurrency(property.deposit)}
            </p>
            <PropertyEnquiryForm propertyId={property.id} />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {siteContent.contact.phone ? (
                <>
                  Or call{" "}
                  <a
                    href={`tel:${siteContent.contact.phone.replace(/\s/g, "")}`}
                    className="font-medium text-primary"
                  >
                    {siteContent.contact.phone}
                  </a>
                </>
              ) : (
                <>
                  Or email{" "}
                  <a
                    href={`mailto:${siteContent.contact.email}`}
                    className="font-medium text-[oklch(0.45_0.06_55)]"
                  >
                    {siteContent.contact.email}
                  </a>
                </>
              )}
            </p>
            <Button
              asChild
              variant={isVeri ? "default" : "link"}
              className={cn(
                "mt-2 w-full",
                isVeri &&
                  "rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
              )}
            >
              <Link href="/apply">Apply to rent this property</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
