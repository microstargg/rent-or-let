import type { Metadata } from "next";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Client Money Protection",
};

export default async function CmpPage() {
  const { site: siteContent, name, id } = await getTenant();
  const isVeri = isVeriAgency(id);

  return (
    <div
      className={cn(
        "container mx-auto max-w-3xl px-4 py-12",
        isVeri && "pt-28 md:pt-32"
      )}
    >
      <h1
        className={cn(
          "text-4xl font-bold",
          isVeri && "font-[family-name:var(--font-veri-sans)] tracking-tight"
        )}
      >
        Client Money Protection
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        {name} is a member of the {siteContent.cmp.scheme}. Client money held on behalf of landlords
        and tenants is protected in accordance with the scheme rules.
      </p>
      <div
        className={
          isVeri
            ? "mt-8 rounded-[1.75rem] border border-foreground/10 bg-card/50 p-6"
            : "mt-8 rounded-xl border bg-card p-6"
        }
      >
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
