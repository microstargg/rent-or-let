import Link from "next/link";
import { Bed, MapPin } from "lucide-react";
import type { PublicListing } from "@repo/site-core";
import { cn, formatCurrency } from "@/lib/utils";
import {
  availabilityLabel,
  furnishedLabel,
  isAvailableNow,
  primaryFirstImages,
  shortAddress,
} from "@/lib/listing";
import { CardPhotos } from "@/components/properties/card-photos";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

export async function PropertyCard({
  property,
  variant = "default",
  className,
}: {
  property: PublicListing;
  /** "feature" is the larger hero card on the home page. */
  variant?: "default" | "feature";
  className?: string;
}) {
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

  const availability = availabilityLabel(property);
  const availableNow = isAvailableNow(property);
  const furnished = furnishedLabel(property.furnished);
  const facts: Array<{ value: string; label: string }> =
    variant === "feature"
      ? [
          { value: String(property.bedrooms), label: property.bedrooms === 1 ? "bedroom" : "bedrooms" },
          { value: String(property.bathrooms), label: property.bathrooms === 1 ? "bathroom" : "bathrooms" },
          ...(furnished ? [{ value: furnished.split(" ")[0], label: furnished.split(" ").slice(1).join(" ") || "furnishing" }] : []),
        ]
      : [
          { value: String(property.bedrooms), label: property.bedrooms === 1 ? "bedroom" : "bedrooms" },
          { value: formatCurrency(property.deposit), label: "deposit" },
          property.epcRating
            ? { value: `EPC ${property.epcRating}`, label: "energy" }
            : { value: String(property.bathrooms), label: property.bathrooms === 1 ? "bathroom" : "bathrooms" },
        ];
  const href = `/properties/${property.slug}`;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground transition-shadow duration-300 focus-within:ring-2 focus-within:ring-ring hover:shadow-[0_18px_40px_-24px_rgba(12,18,26,0.45)]",
        className
      )}
    >
      {/* The photo strip sits above the stretched link so it can still be swiped. */}
      <Link href={href} tabIndex={-1} aria-hidden className="relative z-10 block">
        <CardPhotos
          images={primaryFirstImages(property)}
          alt={property.displayAddress}
          priority={variant === "feature"}
          className={variant === "feature" ? "aspect-[4/3] max-lg:aspect-[16/10]" : "aspect-[4/3]"}
        />
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-md bg-card px-2.5 py-1 text-[13px] font-semibold text-foreground shadow-sm">
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", availableNow ? "bg-[var(--success)]" : "bg-accent")}
          />
          {availability}
        </span>
      </Link>
      <div className={cn("flex flex-1 flex-col", variant === "feature" ? "p-5 md:p-6" : "p-5")}>
        <p
          className={cn(
            "font-extrabold tabular-nums tracking-tight",
            variant === "feature" ? "text-4xl" : "text-[1.875rem] leading-tight"
          )}
        >
          {formatCurrency(property.pricePcm)}
          <span className="ml-1 text-[15px] font-medium tracking-normal text-muted-foreground">pcm</span>
        </p>
        <h2 className="mb-4 mt-1 font-semibold leading-snug">
          {/* Stretched link: the whole card is clickable. */}
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4"
          >
            {shortAddress(property)}
          </Link>
        </h2>
        <dl className="mt-auto flex border-t pt-3.5 text-sm text-muted-foreground [&>div+div]:ml-3 [&>div+div]:border-l [&>div+div]:pl-3">
          {facts.map(({ value, label }) => (
            <div key={label} className="flex min-w-0 flex-1 flex-col-reverse">
              <dt>{label}</dt>
              <dd className="truncate text-[15px] font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
