import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/properties/property-card";
import { HeroSearch } from "@/components/properties/hero-search";
import { OfficeHours } from "@/components/marketing/office-hours";
import { VeriHome } from "@/components/marketing/veri-home";
import { tryFetchListings } from "@/lib/platform";
import { getTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const tenant = await getTenant();
  const { site: siteContent, name, id } = tenant;

  if (id === "veri-properties") {
    return <VeriHome tenant={tenant} />;
  }

  const result = await tryFetchListings();
  const listings = result ?? [];
  const home = siteContent.home;
  const region = siteContent.region;
  const { address, hours, phone } = siteContent.contact;
  const trustPoints: Array<{ title: string; description: string; stat?: string }> = (
    home?.trustPoints ?? siteContent.about.highlights
  ).slice(0, 3);

  // Hero card: the first home with a photo, so the hero always shows a real listing.
  const heroListing = listings.find((listing) => listing.images.length > 0);
  const shelf = listings.filter((listing) => listing.id !== heroListing?.id).slice(0, 3);
  const homesLabel = `${listings.length} ${listings.length === 1 ? "home" : "homes"}`;
  const searchable = listings.map(({ bedrooms, pricePcm, town }) => ({ bedrooms, pricePcm, town }));
  const services = siteContent.landlords.services.slice(0, 4);
  const directionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [address.line1, address.line2, address.city, address.postcode].join(", ")
      )}`
    : null;

  return (
    <>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className={cn(
            "container relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:py-16 lg:gap-14 lg:py-20",
            heroListing && "lg:grid-cols-[7fr_5fr]"
          )}
        >
          <div>
            <p className="mb-4 text-[15px] font-semibold text-primary-foreground/75">
              {home?.eyebrow ?? (region ? `Letting agents in ${region}` : "UK letting agents")}
            </p>
            <h1 className="max-w-[14ch] text-[clamp(2.5rem,5.4vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-balance">
              {home?.title ?? "Quality rental homes, managed properly"}
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg text-primary-foreground/85 md:text-[19px]">
              {siteContent.hero.subtitle}
            </p>
            <HeroSearch
              listings={searchable}
              countsAvailable={result !== null}
              className="mt-8 max-w-3xl md:mt-9"
            />
            <p className="mt-3.5 text-sm text-primary-foreground/75" aria-live="polite">
              {result === null ? (
                <>
                  Listings are taking a moment to load.{" "}
                  <Link href="/properties" className="font-semibold text-primary-foreground underline underline-offset-4">
                    Browse all homes
                  </Link>
                </>
              ) : (
                <>
                  <b className="font-semibold text-primary-foreground tabular-nums">{homesLabel}</b> to let right now
                  {region ? ` across ${region}` : ""}
                </>
              )}
            </p>
          </div>
          {heroListing ? (
            <PropertyCard
              property={heroListing}
              variant="feature"
              className="h-auto border-0 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)] lg:-rotate-1 lg:transition-transform lg:duration-500 lg:hover:rotate-0 motion-reduce:lg:rotate-0"
            />
          ) : null}
        </div>
      </section>

      <section aria-label={`Why ${name}`} className="border-b bg-card">
        <div className="container mx-auto grid max-w-6xl px-4 md:grid-cols-3">
          {trustPoints.map(({ title, description, stat }, index) => (
            <div
              key={title}
              className={cn(
                "py-7 md:py-9 md:pr-8",
                index > 0 && "border-t md:border-l md:border-t-0 md:pl-8"
              )}
            >
              {stat ? (
                <p className="text-[2.6rem] font-extrabold leading-none tracking-[-0.03em] text-primary tabular-nums">
                  {stat}
                </p>
              ) : null}
              <h2 className={cn("font-semibold", stat ? "mt-3 text-[17px]" : "text-xl text-primary")}>{title}</h2>
              <p className="mt-2 max-w-[34ch] text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {shelf.length > 0 && (
        <section className="py-14 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[clamp(1.875rem,3.2vw,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
                  Homes to let now
                </h2>
                <p className="mt-2 text-[17px] text-muted-foreground">
                  {region ? `Available across ${region}, straight from our books.` : "Straight from our books, updated as homes are let."}
                </p>
              </div>
              <Button asChild variant="outline" className="h-11 self-start bg-card md:self-auto">
                <Link href="/properties">
                  See all {homesLabel}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-3">
              {shelf.map((property) => (
                <div key={property.id} className="w-[82%] shrink-0 snap-start md:w-auto">
                  <PropertyCard property={property} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={cn("pb-14 md:pb-20", shelf.length === 0 && "pt-14 md:pt-20")}>
        <div className="container mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-2 md:gap-6">
          <div className="flex flex-col rounded-xl border bg-card p-6 md:p-10">
            <p className="text-sm font-bold text-accent">Renting a home</p>
            <h2 className="mt-2 max-w-[16ch] text-[1.75rem] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[2.125rem]">
              Find it, view it, apply online
            </h2>
            <p className="mt-3 text-muted-foreground">
              {home?.tenantsBlurb ?? "Advice, maintenance, and quality homes to rent."}
            </p>
            <ul className="mb-8 mt-6">
              {[
                { href: "/properties", label: "Browse homes to let", meta: result ? homesLabel : null },
                { href: "/apply", label: "Apply to rent", meta: null },
                { href: "/tenants", label: "Advice for tenants", meta: null },
              ].map(({ href, label, meta }) => (
                <li key={href} className="border-t">
                  <Link href={href} className="group flex items-center justify-between gap-4 py-3 font-medium hover:text-primary">
                    {label}
                    <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                      {meta}
                      <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t">
                <a
                  href={siteContent.fees.permittedPaymentsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 py-3 font-medium hover:text-primary"
                >
                  How to Rent guide
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    gov.uk
                    <ArrowUpRight aria-hidden className="h-4 w-4" />
                  </span>
                </a>
              </li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-2.5">
              <Button asChild className="h-11">
                <Link href="/properties">Browse homes</Link>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link href="/apply">Apply to rent</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-[var(--ink)] p-6 text-white md:p-10">
            <p className="text-sm font-bold text-white/65">Letting your property</p>
            <h2 className="mt-2 max-w-[18ch] text-[1.75rem] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[2.125rem]">
              {siteContent.landlords.hero.title}
            </h2>
            <p className="mt-3 text-white/70">
              {home?.landlordsBlurb ?? "Full management, tenant finding, and compliance support."}
            </p>
            {services.length > 0 ? (
              <ul className="mb-8 mt-6">
                {services.map((service) => (
                  <li key={service} className="border-t border-white/15 py-3 font-medium">
                    {service}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-8" />
            )}
            <div className="mt-auto flex flex-wrap gap-2.5">
              <Button asChild className="h-11 bg-white text-[var(--ink)] hover:bg-white/90">
                <Link href="/landlords">Landlord services</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/contact">Talk to us about letting</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-card py-14 md:py-20">
        <div
          className={cn(
            "container mx-auto grid max-w-6xl gap-10 px-4",
            (address || hours?.length) && "lg:grid-cols-[7fr_5fr] lg:gap-14"
          )}
        >
          <div>
            <h2 className="text-[clamp(1.875rem,3.2vw,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              {name}
            </h2>
            <p className="mt-6 text-[clamp(1.25rem,2vw,1.75rem)] font-medium leading-snug tracking-[-0.01em]">
              {siteContent.about.summary}
            </p>
            <Button asChild variant="outline" className="mt-7 h-11">
              <Link href="/about">About us</Link>
            </Button>
          </div>
          {address || hours?.length ? (
            <div className="self-start rounded-xl border bg-background p-6 md:p-7">
              <h2 className="text-xl font-bold">{address ? "Visit the office" : "Opening hours"}</h2>
              {address ? (
                <p className="mt-2 flex gap-2 text-muted-foreground">
                  <MapPin aria-hidden className="mt-1 h-4 w-4 shrink-0" />
                  <span>
                    {address.line2}
                    <br />
                    {address.city} {address.postcode}
                  </span>
                </p>
              ) : null}
              {hours?.length ? <OfficeHours hours={hours} /> : null}
              <div className="mt-5 flex flex-wrap gap-2.5">
                {directionsUrl ? (
                  <Button asChild variant="outline" className="h-11 flex-1 bg-card">
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                      Get directions
                    </a>
                  </Button>
                ) : null}
                {phone ? (
                  <Button asChild className="h-11 flex-1 tabular-nums">
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>Call {phone}</a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
