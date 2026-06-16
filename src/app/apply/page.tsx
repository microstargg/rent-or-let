import type { Metadata } from "next";
import { TenantApplicationForm } from "@/components/forms/tenant-application-form";
import { PageHero } from "@/components/marketing/page-hero";
import { getAvailableProperties } from "@/lib/data/properties";

export const metadata: Metadata = {
  title: "Apply to rent",
  description: "Submit a tenant application to Property Management Services.",
};

export default async function ApplyPage() {
  const properties = await getAvailableProperties();

  return (
    <>
      <PageHero
        eyebrow="Apply"
        title="Tenant application"
        subtitle="Complete this form to apply for a property. Reference checking normally takes five to ten working days."
      />
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            All fields marked required must be completed. You will need ID, proof
            of residency and a holding deposit of one week&apos;s rent.
          </p>
          <TenantApplicationForm
            properties={properties.map((p) => ({ id: p.id, label: p.display_address }))}
          />
        </div>
      </div>
    </>
  );
}
