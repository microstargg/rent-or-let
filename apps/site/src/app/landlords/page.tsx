import type { Metadata } from "next";
import {
  ClipboardCheck,
  Key,
  PoundSterling,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { VeriEm, VeriHeading, VeriPanel, VeriSection } from "@/components/marketing/veri-ui";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getTenant();
  return {
    title: "Landlord services",
    description: site.landlords.hero.subtitle,
  };
}

const serviceIcons = [ClipboardCheck, Wrench, PoundSterling, Key, ShieldCheck];

export default async function LandlordsPage() {
  const { site: siteContent, id } = await getTenant();
  const { landlords } = siteContent;
  const isVeri = isVeriAgency(id);

  if (isVeri) {
    return (
      <>
        <PageHero
          eyebrow={landlords.hero.eyebrow}
          title={landlords.hero.title}
          subtitle={landlords.hero.subtitle}
        />

        <VeriSection>
          <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-muted-foreground">
            {landlords.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </VeriSection>

        <VeriSection tone="dark">
          <VeriHeading>
            What we manage for <VeriEm>you</VeriEm>
          </VeriHeading>
          <p className="mt-3 max-w-2xl text-white/65">
            Full management from marketing through to check-out — so you can enjoy peace of mind
            throughout every tenancy.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {landlords.services.map((service, index) => {
              const Icon = serviceIcons[index % serviceIcons.length];
              return (
                <div key={service} className="border-b border-white/15 pb-5">
                  <Icon className="mb-3 h-5 w-5 text-[var(--accent)]" />
                  <p className="text-sm leading-relaxed text-white/80">{service}</p>
                </div>
              );
            })}
          </div>
        </VeriSection>

        <VeriSection tone="muted">
          <VeriPanel>
            <VeriHeading as="h3">Contractors and emergency cover</VeriHeading>
            <p className="mt-4 leading-relaxed text-muted-foreground">{landlords.contractors}</p>
          </VeriPanel>
        </VeriSection>

        <TrustStrip />

        <VeriSection>
          <VeriHeading>Landlord fees</VeriHeading>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
            {landlords.fees.summary}
          </p>
          <div className="mt-12 space-y-12">
            {landlords.fees.items.map((group) => (
              <div key={group.category}>
                <h3 className="font-[family-name:var(--font-veri-sans)] text-lg font-semibold">
                  {group.category}
                </h3>
                <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-foreground/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/10 bg-muted/40 text-left">
                        <th className="px-4 py-3 font-medium">Fee</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="hidden px-4 py-3 font-medium md:table-cell">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.fees.map((fee) => (
                        <tr key={fee.label} className="border-b border-foreground/5 last:border-0">
                          <td className="px-4 py-3 font-medium">{fee.label}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-[oklch(0.45_0.06_55)]">
                            {fee.amount}
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                            {fee.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </VeriSection>

        <CtaBanner
          title="Discuss your property with us"
          description="Whether you need full management from day one or want to transfer an existing tenancy, email the team and we’ll take it from there."
          primaryHref="/contact"
          primaryLabel="Get in touch"
          secondaryHref="/about"
          secondaryLabel="About us"
        />
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow={landlords.hero.eyebrow}
        title={landlords.hero.title}
        subtitle={landlords.hero.subtitle}
      />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-3xl space-y-4 leading-relaxed text-muted-foreground">
          {landlords.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">What we manage for you</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Full management from marketing through to check-out — so you can enjoy peace of mind
            throughout every tenancy.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {landlords.services.map((service, index) => {
              const Icon = serviceIcons[index % serviceIcons.length];
              return (
                <div
                  key={service}
                  className="flex items-start gap-3 rounded-xl border bg-card p-5 shadow-sm"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed">{service}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8">
          <h2 className="text-xl font-semibold">Contractors and emergency cover</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{landlords.contractors}</p>
        </div>
      </section>

      <TrustStrip />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">Landlord fees</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
          {landlords.fees.summary}
        </p>
        <div className="mt-10 space-y-10">
          {landlords.fees.items.map((group) => (
            <div key={group.category}>
              <h3 className="text-lg font-semibold">{group.category}</h3>
              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="px-4 py-3 font-medium">Fee</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.fees.map((fee) => (
                      <tr key={fee.label} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{fee.label}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-primary">{fee.amount}</td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {fee.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner
        title="Discuss your property with us"
        description="Whether you need full management from day one or want to transfer an existing tenancy, our team is ready to help."
        primaryHref="/contact"
        primaryLabel="Get in touch"
        secondaryHref="/about"
        secondaryLabel="About us"
      />
    </>
  );
}
