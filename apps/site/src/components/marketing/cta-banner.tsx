import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTenant } from "@/lib/tenant";

interface CtaBannerProps {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export async function CtaBanner({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: CtaBannerProps) {
  const { site: siteContent, id } = await getTenant();
  const phone = siteContent.contact.phone;
  const email = siteContent.contact.email;
  const isVeri = id === "veri-properties";

  return (
    <section
      className={
        isVeri
          ? "bg-[#141414] text-white"
          : "bg-primary text-primary-foreground"
      }
    >
      <div className="container mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2
              className={
                isVeri
                  ? "font-[family-name:var(--font-veri-sans)] text-2xl font-bold tracking-tight md:text-3xl"
                  : "text-2xl font-bold"
              }
            >
              {title}
            </h2>
            <p
              className={
                isVeri ? "mt-2 text-white/70" : "mt-2 text-primary-foreground/90"
              }
            >
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className={
                isVeri
                  ? "rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
                  : undefined
              }
              variant={isVeri ? "default" : "secondary"}
            >
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            {secondaryHref && secondaryLabel && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className={
                  isVeri
                    ? "rounded-full border-white/25 bg-transparent text-white hover:bg-white/10"
                    : "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                }
              >
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            )}
            {phone ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <a href={`tel:${phone.replace(/\s/g, "")}`}>Call {phone}</a>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                variant="outline"
                className={
                  isVeri
                    ? "rounded-full border-white/25 bg-transparent text-white hover:bg-white/10"
                    : "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                }
              >
                <a href={`mailto:${email}`}>Email us</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
