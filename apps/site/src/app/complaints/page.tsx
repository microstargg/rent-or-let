import type { Metadata } from "next";
import { ComplaintForm } from "@/components/forms/complaint-form";
import { PageHero } from "@/components/marketing/page-hero";
import { VeriPanel } from "@/components/marketing/veri-ui";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getTenant();
  return {
    title: "Make a complaint",
    description: `Submit a complaint to ${name}. We respond within 5 working days.`,
  };
}

export default async function ComplaintsPage() {
  const { id } = await getTenant();
  const isVeri = isVeriAgency(id);

  return (
    <>
      <PageHero
        eyebrow="Complaints"
        title="Make a complaint"
        subtitle="We take complaints seriously and are members of the Property Redress Scheme."
      />
      <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
        {isVeri ? (
          <VeriPanel>
            <p className="text-sm text-muted-foreground">
              Submit your complaint below and we will respond within 5 working days by email. If you
              are unhappy with our response, you may refer your complaint to the Property Redress
              Scheme.
            </p>
            <ComplaintForm />
          </VeriPanel>
        ) : (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              Submit your complaint below and we will respond within 5 working days. If you are
              unhappy with our response, you may refer your complaint to the Property Redress
              Scheme.
            </p>
            <ComplaintForm />
          </div>
        )}
      </div>
    </>
  );
}
