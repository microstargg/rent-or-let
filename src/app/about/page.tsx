import type { Metadata } from "next";
import { siteContent } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "About us",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold">About Property Management Services</h1>
      <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
        {siteContent.about.summary}
      </p>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        We are landlords ourselves as well as letting agents, so we understand what is required.
        We work with a wide range of contractors to provide a dedicated property management
        service with the experience, expertise and focus required to manage all aspects of
        residential and commercial lettings.
      </p>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        Meeting the needs of our customers is our core focus. Our tenants rarely move other than
        when they outgrow their home or move away from the area — a testament to the quality of
        our service and properties.
      </p>
    </div>
  );
}
