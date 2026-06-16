import Link from "next/link";
import { ArrowRight, Building2, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/properties/property-card";
import { getFeaturedProperties } from "@/lib/data/properties";
import { siteContent } from "@/lib/content/site";

export default async function HomePage() {
  const featured = await getFeaturedProperties(3);

  return (
    <>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary-foreground/80">
            Teesside letting agents
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Affordable homes with landlord services you can rely on
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
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Client Money Protection",
              text: "We are members of the UKALA Client Protection Scheme.",
            },
            {
              icon: Users,
              title: "40+ years experience",
              text: "Residential and commercial property management across Teesside.",
            },
            {
              icon: Building2,
              title: "One call service",
              text: "Dedicated support for landlords and tenants, 24-hour emergency call-outs.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <Icon className="mb-4 h-8 w-8 text-primary" />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="bg-muted/40 py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Featured properties</h2>
                <p className="mt-2 text-muted-foreground">
                  Quality homes across Middlesbrough and Teesside
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
            <h2 className="text-3xl font-bold">Property Management Services</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
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
                Full management, tenant finding, and compliance support.
              </p>
            </Link>
            <Link
              href="/tenants"
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold">For tenants</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Advice, maintenance, and quality homes in Teesside.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
