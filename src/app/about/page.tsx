import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Heart, Users } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { Button } from "@/components/ui/button";
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Family-owned letting agents in Middlesbrough with over 40 years of experience in residential and commercial property management across Teesside.",
};

export default function AboutPage() {
  const { about } = siteContent;

  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Property Management Services"
        subtitle={about.summary}
      />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="space-y-4 text-muted-foreground leading-relaxed lg:col-span-3">
            {about.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Advice for landlords and tenants</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                We offer advice to our tenants and landlords throughout every
                tenancy. With a one-call service and 24-hour emergency call-outs,
                you can put your trust in us.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="sm">
                  <Link href="/landlords">Landlord services</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/tenants">Tenant services</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/40 py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">Why choose us</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Good quality properties within the Teesside area, backed by decades of
            local expertise.
          </p>
          <div className="mt-8">
            <FeatureGrid
              columns={4}
              items={about.highlights.map((item) => ({
                title: item.title,
                description: item.description,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Dedicated support",
              text: "A personal service for landlords and tenants — we are big enough to cope and small enough to care.",
            },
            {
              icon: Building2,
              title: "Residential & commercial",
              text: "Full lettings and management across residential and commercial property throughout Teesside.",
            },
            {
              icon: Heart,
              title: "Tenants who stay",
              text: "Our tenants rarely move other than when they outgrow their home or leave the area — a testament to the quality of our service.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 text-center shadow-sm"
            >
              <Icon className="mx-auto mb-4 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <TrustStrip />

      <CtaBanner
        title="Get in touch with our team"
        description="Visit our office on Kings Road, North Ormesby, or call us Monday to Friday, 10:00 to 17:00."
        primaryHref="/contact"
        primaryLabel="Contact us"
        secondaryHref="/properties"
        secondaryLabel="View properties"
      />
    </>
  );
}
