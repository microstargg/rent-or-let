import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Landlord services",
};

export default function LandlordsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold">Services for landlords</h1>
      <p className="mt-6 text-muted-foreground leading-relaxed">
        With over 40 years of experience in residential and commercial property management, we
        provide a complete letting and management service across Teesside. As landlords ourselves,
        we understand your priorities.
      </p>
      <ul className="mt-6 space-y-3">
        {[
          "Tenant finding and referencing",
          "Full property management",
          "Rent collection and accounting",
          "Maintenance coordination with trusted contractors",
          "Compliance and safety certification support",
          "24-hour emergency call-out service",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
      <Button asChild className="mt-8">
        <Link href="/contact">Discuss your property</Link>
      </Button>
    </div>
  );
}
