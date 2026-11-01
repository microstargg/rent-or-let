import Link from "next/link";
import type { PublicListing } from "@repo/site-core";
import { formatCurrency } from "@/lib/utils";
import { availabilityLabel, isAvailableNow, primaryFirstImages, shortAddress } from "@/lib/listing";
import { Line, Tick } from "./ui";

/** A home to let, set as a short statement: photo, address, then rent, deposit and bedrooms. */
export function VeriCard({ property, priority }: { property: PublicListing; priority?: boolean }) {
  const href = `/properties/${property.slug}`;
  const photo = primaryFirstImages(property)[0];
  const availableNow = isAvailableNow(property);

  return (
    <article className="v-card v-hover">
      <div className="v-card__photo">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={photo.altText || `Photo of ${property.displayAddress}`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-[var(--v-muted)]">
            Photos coming soon
          </span>
        )}
        <span className="v-card__avail">
          {availableNow ? <Tick drawn /> : null}
          {availabilityLabel(property)}
        </span>
      </div>
      <h3 className="v-card__title">
        <Link href={href}>{shortAddress(property)}</Link>
        <Tick hover />
      </h3>
      <ul className="mt-3">
        <Line tick={false} label="Rent" amount={<>{formatCurrency(property.pricePcm)} pcm</>} />
        <Line tick={false} label="Deposit" amount={formatCurrency(property.deposit)} />
        <Line tick={false} label="Bedrooms" amount={property.bedrooms} />
        {property.epcRating ? <Line tick={false} label="Energy rating" amount={`EPC ${property.epcRating}`} /> : null}
      </ul>
    </article>
  );
}
