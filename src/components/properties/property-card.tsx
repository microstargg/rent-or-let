import Link from "next/link";
import { Bed, MapPin } from "lucide-react";
import type { Property } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const primaryImage = property.images?.find((i) => i.is_primary)?.url;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] bg-muted">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={property.display_address}
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
          {formatCurrency(property.price_pcm)}
          <span className="text-sm font-normal text-muted-foreground"> pcm</span>
        </p>
        <h3 className="mt-1 font-semibold leading-snug">
          <Link href={`/properties/${property.slug}`} className="hover:text-primary">
            {property.display_address}
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
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {property.summary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
