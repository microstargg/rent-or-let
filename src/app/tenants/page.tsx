import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tenant services",
};

export default function TenantsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold">Services for tenants</h1>
      <p className="mt-6 text-muted-foreground leading-relaxed">
        We offer good quality properties within the Teesside area and provide advice and support
        throughout your tenancy. You can put your trust in us — we are big enough to cope and
        small enough to care.
      </p>
      <ul className="mt-6 space-y-3">
        {[
          "Quality, affordable homes across Teesside",
          "Advice on your rights and responsibilities",
          "Responsive maintenance and 24-hour emergency call-outs",
          "Transparent permitted payments under the Tenant Fees Act",
          "Online tenant application process",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/properties">View properties</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/apply">Apply to rent</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/complaints">Make a complaint</Link>
        </Button>
      </div>
    </div>
  );
}
