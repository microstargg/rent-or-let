import Link from "next/link";
import { Bed, MapPin } from "lucide-react";
import type { PublicListing } from "@repo/site-core";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

export async function PropertyCard({ property }: { property: PublicListing }) {
  const { id } = await getTenant();
  const isVeri = isVeriAgency(id);
  const primaryImage =
    property.images.find((image) => image.isPrimary)?.url ?? property.images[0]?.url;

  if (isVeri) {
    return (
      <article className="group flex h-full flex-col">
        <Link
          href={`/properties/${property.slug}`}
          className="relative block overflow-hidden rounded-[1.5rem] bg-muted"
        >
          <div className="aspect-[4/3]">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={property.displayAddress}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Photo coming soon
              </div>
            )}
          </div>
        </Link>
        <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
          <p className="font-[family-name:var(--font-veri-sans)] text-xl font-bold tracking-tight md:text-2xl">
            {formatCurrency(property.pricePcm)}
            <span className="text-sm font-normal text-muted-foreground"> pcm</span>
          </p>
          <h3 className="mt-2 text-base font-medium leading-snug text-foreground/90 md:text-lg">
            <Link
              href={`/properties/${property.slug}`}
              className="transition-colors hover:text-[oklch(0.45_0.06_55)]"
            >
              {property.displayAddress}
            </Link>
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Bed className="h-3.5 w-3.5" />
              {property.bedrooms} bed
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {property.town}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] bg-muted">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={property.displayAddress}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Photo coming soon
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(property.pricePcm)}
          <span className="text-sm font-normal text-muted-foreground"> pcm</span>
        </p>
        <h3 className="mt-1 font-semibold leading-snug">
          <Link href={`/properties/${property.slug}`} className="hover:text-primary">
            {property.displayAddress}
          </Link>
        </h3>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {property.town}
          </span>
        </div>
        {property.summary && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{property.summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
