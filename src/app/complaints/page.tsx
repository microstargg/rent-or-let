import type { Metadata } from "next";
import { ComplaintForm } from "@/components/forms/complaint-form";

export const metadata: Metadata = {
  title: "Make a complaint",
};

export default function ComplaintsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-bold">Make a complaint</h1>
      <p className="mt-2 text-muted-foreground">
        We take complaints seriously. Submit your complaint below and we will respond within
        5 working days.
      </p>
      <ComplaintForm />
    </div>
  );
}
