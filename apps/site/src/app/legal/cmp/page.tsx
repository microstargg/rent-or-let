import type { Metadata } from "next";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Client Money Protection",
};

export default async function CmpPage() {
  const { site: siteContent, name } = await getTenant();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold">Client Money Protection</h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        {name} is a member of the {siteContent.cmp.scheme}. Client money held on behalf of
        landlords and tenants is protected in accordance with the scheme rules.
      </p>
      <div className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Certificate</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          View our Client Money Protection certificate:
        </p>
        <Link
          href={siteContent.cmp.certificateUrl}
          className="mt-4 inline-block text-primary underline"
          target="_blank"
        >
          Download CMP Certificate (PDF)
        </Link>
      </div>
    </div>
  );
}
