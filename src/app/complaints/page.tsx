import type { Metadata } from "next";
import { ComplaintForm } from "@/components/forms/complaint-form";
import { PageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Make a complaint",
  description:
    "Submit a complaint to Property Management Services. We respond within 5 working days.",
};

export default function ComplaintsPage() {
  return (
    <>
      <PageHero
        eyebrow="Complaints"
        title="Make a complaint"
        subtitle="We take complaints seriously and are members of the Property Redress Scheme."
      />
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Submit your complaint below and we will respond within 5 working days.
            If you are unhappy with our response, you may refer your complaint to
            the Property Redress Scheme.
          </p>
          <ComplaintForm />
        </div>
      </div>
    </>
  );
}
