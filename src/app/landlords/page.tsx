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
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Landlord services",
  description:
    "Full property management for landlords across Teesside — tenant finding, rent collection, compliance and 24-hour emergency call-outs.",
};

const serviceIcons = [ClipboardCheck, Wrench, PoundSterling, Key, ShieldCheck];

export default function LandlordsPage() {
  const { landlords } = siteContent;

  return (
    <>
      <PageHero
        eyebrow={landlords.hero.eyebrow}
        title={landlords.hero.title}
        subtitle={landlords.hero.subtitle}
      />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-3xl space-y-4 text-muted-foreground leading-relaxed">
          {landlords.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">What we manage for you</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Full management from marketing through to check-out — so you can enjoy
            peace of mind throughout every tenancy.
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
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {landlords.contractors}
          </p>
        </div>
      </section>

      <TrustStrip />

      <section className="container mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold">Landlord fees</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">
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
                      <th className="hidden px-4 py-3 font-medium md:table-cell">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.fees.map((fee) => (
                      <tr key={fee.label} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{fee.label}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-primary">
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
