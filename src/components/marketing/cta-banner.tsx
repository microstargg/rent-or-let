import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteContent } from "@/lib/content/site";

interface CtaBannerProps {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CtaBanner({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: CtaBannerProps) {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="mt-2 text-primary-foreground/90">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            {secondaryHref && secondaryLabel && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <a href={`tel:${siteContent.contact.phone.replace(/\s/g, "")}`}>
                Call {siteContent.contact.phone}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
