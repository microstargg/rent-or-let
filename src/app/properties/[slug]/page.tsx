import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bed, Bath, Calendar, ExternalLink } from "lucide-react";
import { getPropertyBySlug } from "@/lib/data/properties";
import { formatCurrency, formatDate } from "@/lib/utils";
import { siteContent } from "@/lib/content/site";
import { Button } from "@/components/ui/button";
import { PropertyEnquiryForm } from "@/components/properties/property-enquiry-form";
import { FeesDisclosure } from "@/components/compliance/fees-disclosure";

interface PropertyDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: "Property not found" };
  return {
    title: property.display_address,
    description: property.summary ?? property.description.slice(0, 160),
  };
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const primaryImage = property.images?.find((i) => i.is_primary);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage.url}
                alt={property.display_address}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Photos coming soon
              </div>
            )}
          </div>

          <div className="mt-8">
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(property.price_pcm)}
              <span className="text-base font-normal text-muted-foreground"> per calendar month</span>
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              {property.display_address}
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
                {formatDate(property.available_from)}
              </span>
            </div>

            <div className="mt-6 prose prose-neutral max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {property.description}
              </p>
            </div>

            {property.features.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {property.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <FeesDisclosure
              rent={property.price_pcm}
              deposit={property.deposit}
              holdingDeposit={property.holding_deposit}
            />

            <div className="mt-6 flex flex-wrap gap-3">
              {property.epc_url && (
                <Button asChild variant="outline" size="sm">
                  <a href={property.epc_url} target="_blank" rel="noopener noreferrer">
                    View EPC <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
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
          <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Enquire about this property</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deposit: {formatCurrency(property.deposit)}
            </p>
            <PropertyEnquiryForm propertyId={property.id} />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Or call{" "}
              <a
                href={`tel:${siteContent.contact.phone.replace(/\s/g, "")}`}
                className="font-medium text-primary"
              >
                {siteContent.contact.phone}
              </a>
            </p>
            <Button asChild variant="link" className="mt-2 w-full">
              <Link href="/apply">Apply to rent this property</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
