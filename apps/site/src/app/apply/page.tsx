import type { Metadata } from "next";
import { TenantApplicationForm } from "@/components/forms/tenant-application-form";
import { PageHero } from "@/components/marketing/page-hero";
import { VeriPanel } from "@/components/marketing/veri-ui";
import { fetchListings } from "@/lib/platform";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getTenant();
  return {
    title: "Apply to rent",
    description: `Submit a tenant application to ${name}.`,
  };
}

export default async function ApplyPage() {
  const properties = await fetchListings();
  const { id } = await getTenant();
  const isVeri = isVeriAgency(id);

  return (
    <>
      <PageHero
        eyebrow="Apply"
        title="Tenant application"
        subtitle="Complete this form to apply for a property. Reference checking normally takes five to ten working days."
      />
      <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
        {isVeri ? (
          <VeriPanel>
            <p className="text-sm text-muted-foreground">
              All fields marked required must be completed. You will need ID, proof of residency and
              a holding deposit of one week&apos;s rent. We&apos;re fully remote — we&apos;ll follow
              up by email.
            </p>
            <TenantApplicationForm
              properties={properties.map((p) => ({ id: p.id, label: p.displayAddress }))}
            />
          </VeriPanel>
        ) : (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              All fields marked required must be completed. You will need ID, proof of residency and
              a holding deposit of one week&apos;s rent.
            </p>
            <TenantApplicationForm
              properties={properties.map((p) => ({ id: p.id, label: p.displayAddress }))}
            />
          </div>
        )}
      </div>
    </>
  );
}
