import Link from "next/link";
import { ArrowRight, Building2, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/properties/property-card";
import { VeriHome } from "@/components/marketing/veri-home";
import { fetchListingsOrEmpty } from "@/lib/platform";
import { getTenant } from "@/lib/tenant";
import { formatCurrency } from "@/lib/utils";

export default async function HomePage() {
  const tenant = await getTenant();
  const { site: siteContent, name, id } = tenant;

  if (id === "veri-properties") {
    return <VeriHome tenant={tenant} />;
  }

  const featured = (await fetchListingsOrEmpty()).slice(0, 3);
  const home = siteContent.home;
  const region = siteContent.region;
  const trustPoints = (home?.trustPoints ?? siteContent.about.highlights).slice(0, 3);
  const trustIcons = [Shield, Users, Building2];

  // Hero photo: the first featured home that has one, so the hero always shows a real listing.
  const heroListing = featured.find((listing) => listing.images.length > 0);
  const heroImage =
    heroListing?.images.find((image) => image.isPrimary) ?? heroListing?.images[0];

  return (
    <>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="container relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary-foreground/80">
              {home?.eyebrow ?? (region ? `Letting agents in ${region}` : "UK letting agents")}
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {home?.title ?? "Quality rental homes, managed properly"}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-primary-foreground/90">
              {siteContent.hero.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link href="/properties">
                  View properties
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
          {heroListing && heroImage ? (
            <Link
              href={`/properties/${heroListing.slug}`}
              className="group relative hidden overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 lg:block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage.url}
                alt={heroImage.altText ?? heroListing.displayAddress}
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-5 pt-16">
                <p className="text-xs font-medium uppercase tracking-widest text-white/75">
                  Featured home
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {heroListing.displayAddress}
                </p>
                <p className="text-sm text-white/85">
                  {formatCurrency(heroListing.pricePcm)} pcm · {heroListing.bedrooms} bed
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {trustPoints.map(({ title, description }, index) => {
            const Icon = trustIcons[index] ?? Shield;
            return (
              <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
                <Icon className="mb-4 h-8 w-8 text-primary" />
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-muted-foreground">{description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Featured properties</h2>
                <p className="mt-2 text-muted-foreground">
                  {region ? `Quality homes across ${region}` : "Homes available to rent now"}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/properties">View all</Link>
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold">{name}</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {siteContent.about.summary}
            </p>
            <Button asChild className="mt-6">
              <Link href="/about">About us</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/landlords"
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold">For landlords</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {home?.landlordsBlurb ?? "Full management, tenant finding, and compliance support."}
              </p>
            </Link>
            <Link
              href="/tenants"
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold">For tenants</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {home?.tenantsBlurb ?? "Advice, maintenance, and quality homes to rent."}
              </p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
