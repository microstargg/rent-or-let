import type { Metadata } from "next";
import { TenantApplicationForm } from "@/components/forms/tenant-application-form";
import { getAvailableProperties } from "@/lib/data/properties";

export const metadata: Metadata = {
  title: "Apply to rent",
  description: "Submit a tenant application to Property Management Services.",
};

export default async function ApplyPage() {
  const properties = await getAvailableProperties();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-bold">Tenant application</h1>
      <p className="mt-2 text-muted-foreground">
        Complete this form to apply for a property. All fields marked required must be completed.
      </p>
      <TenantApplicationForm properties={properties.map((p) => ({ id: p.id, label: p.display_address }))} />
    </div>
  );
}
