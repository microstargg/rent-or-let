import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Heart, Mail, Users } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { VeriEm, VeriHeading, VeriSection } from "@/components/marketing/veri-ui";
import { Button } from "@/components/ui/button";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getTenant();
  return {
    title: "About us",
    description: site.about.summary,
  };
}

export default async function AboutPage() {
  const { site: siteContent, name, id } = await getTenant();
  const { about } = siteContent;
  const isVeri = isVeriAgency(id);

  const sidebarCopy = isVeri
    ? "We support landlords and tenants throughout every tenancy with clear processes and email-first communication. Fully remote, fully accountable."
    : "We offer advice to our tenants and landlords throughout every tenancy. With a one-call service and 24-hour emergency call-outs, you can put your trust in us.";

  const whyChoose = isVeri
    ? "Quality homes managed with transparent fees and compliant processes — without needing a high-street office."
    : "Good quality properties within the Teesside area, backed by decades of local expertise.";

  const pillars = isVeri
    ? [
        {
          icon: Users,
          title: "Dedicated remote support",
          text: "A personal service for landlords and tenants — clear updates, structured processes, and a team that responds by email.",
        },
        {
          icon: Building2,
          title: "Residential lettings",
          text: "Full lettings and management for residential portfolios across the areas we serve.",
        },
        {
          icon: Mail,
          title: "Email-first by design",
          text: "No shop-front hours. Reach us when it suits you — we keep the conversation documented and moving.",
        },
      ]
    : [
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
      ];

  return (
    <>
      <PageHero eyebrow="About us" title={name} subtitle={about.summary} />

      {isVeri ? (
        <VeriSection>
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="space-y-5 text-lg leading-relaxed text-muted-foreground lg:col-span-3">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-[1.75rem] border border-foreground/10 p-6 md:p-8">
                <h2 className="font-[family-name:var(--font-veri-sans)] text-lg font-semibold">
                  Advice for landlords and tenants
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{sidebarCopy}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="sm" className="rounded-full">
                    <Link href="/landlords">Landlord services</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href="/tenants">Tenant services</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </VeriSection>
      ) : (
        <section className="container mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="space-y-4 leading-relaxed text-muted-foreground lg:col-span-3">
              {about.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Advice for landlords and tenants</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{sidebarCopy}</p>
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
      )}

      {isVeri ? (
        <VeriSection tone="dark">
          <VeriHeading>
            Why choose <VeriEm>Veri</VeriEm>
          </VeriHeading>
          <p className="mt-3 max-w-2xl text-white/65">{whyChoose}</p>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {about.highlights.map((item) => (
              <div key={item.title} className="border-b border-white/15 pb-6">
                <h3 className="font-[family-name:var(--font-veri-sans)] text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description}</p>
              </div>
            ))}
          </div>
        </VeriSection>
      ) : (
        <section className="bg-muted/40 py-14">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-bold">Why choose us</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{whyChoose}</p>
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
      )}

      {isVeri ? (
        <VeriSection tone="muted">
          <div className="grid gap-10 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="border-b border-foreground/10 pb-6">
                <Icon className="mb-4 h-7 w-7 text-[oklch(0.55_0.08_55)]" />
                <h3 className="font-[family-name:var(--font-veri-sans)] font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </VeriSection>
      ) : (
        <section className="container mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card p-6 text-center shadow-sm">
                <Icon className="mx-auto mb-4 h-8 w-8 text-primary" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <TrustStrip />

      <CtaBanner
        title={isVeri ? "Start a conversation with Veri" : "Get in touch with our team"}
        description={
          isVeri
            ? "We're fully remote — email the team and we'll respond with clear next steps."
            : "Visit our office on Kings Road, North Ormesby, or call us Monday to Friday, 10:00 to 17:00."
        }
        primaryHref="/contact"
        primaryLabel="Contact us"
        secondaryHref="/properties"
        secondaryLabel="View properties"
      />
    </>
  );
}
