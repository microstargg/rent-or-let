import Link from "next/link";
import { Shield } from "lucide-react";
import { siteContent } from "@/lib/content/site";

export function TrustStrip() {
  return (
    <section className="border-y bg-muted/40 py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">Regulated and protected</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {siteContent.deposits.note}
              </p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {siteContent.memberships.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/legal/cmp" className="text-primary hover:underline">
            View our Client Money Protection certificate →
          </Link>
        </p>
      </div>
    </section>
  );
}
