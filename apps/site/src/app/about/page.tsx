import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Heart, Users } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { VeriAbout } from "@/veri/about";
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
  const tenant = await getTenant();
  const { site: siteContent, name, id } = tenant;
  const { about } = siteContent;
  if (isVeriAgency(id)) return <VeriAbout tenant={tenant} />;

  const sidebarCopy =
    about.sidebar ??
    "We support landlords and tenants throughout every tenancy, with clear processes and a team that keeps you informed.";

  const whyChoose =
    about.whyChoose ?? "Quality homes managed with transparent fees and compliant processes.";

  const pillars = (about.pillars ?? about.highlights).slice(0, 3).map((pillar, index) => ({
    icon: [Users, Building2, Heart][index] ?? Users,
    title: pillar.title,
    text: pillar.description,
  }));

  return (
    <>
      <PageHero eyebrow="About us" title={name} subtitle={about.summary} />

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

      <TrustStrip />

      <CtaBanner
        title="Get in touch with our team"
        description={
          "Visit our office on Kings Road, North Ormesby, or call us Monday to Friday, 10:00 to 17:00."
        }
        primaryHref="/contact"
        primaryLabel="Contact us"
        secondaryHref="/properties"
        secondaryLabel="View properties"
      />
    </>
  );
}
