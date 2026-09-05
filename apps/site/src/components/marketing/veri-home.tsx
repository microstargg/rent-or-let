import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenantConfig } from "@repo/config";
import { VERI_HERO_SRC } from "@/lib/veri";
import { VeriEm, VeriHeading, VeriSection } from "@/components/marketing/veri-ui";

export function VeriHome({ tenant }: { tenant: TenantConfig }) {
  const { site: siteContent, name } = tenant;
  const email = siteContent.contact.email;

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden bg-[#141414] text-white">
        <Image
          src={VERI_HERO_SRC}
          alt="Traditional British brick country home"
          fill
          priority
          className="veri-hero-image object-cover object-[center_42%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 via-[#141414]/45 to-[#141414]/35" />

        <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-4 pb-16 pt-28 md:px-8 md:pb-20 lg:px-12">
          <p
            aria-hidden
            className="veri-fade-up pointer-events-none absolute inset-x-0 top-[28%] select-none text-center font-[family-name:var(--font-veri-sans)] text-[clamp(3.5rem,15vw,11rem)] font-extrabold leading-none tracking-tight text-white/70"
          >
            VERI
          </p>

          <div className="veri-fade-up-delay relative mx-auto w-full max-w-3xl text-center">
            <h1 className="font-[family-name:var(--font-veri-sans)] text-3xl font-semibold tracking-tight md:text-5xl">
              Property management, done <VeriEm>clearly</VeriEm>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/75 md:text-lg">
              {siteContent.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[var(--accent)] px-6 text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
              >
                <Link href="/properties">
                  Browse homes
                  <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/contact">Email the team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <VeriSection tone="light">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Regulated and protected
        </p>
        <ul className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-foreground/80">
          {siteContent.memberships.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </VeriSection>

      <VeriSection tone="dark">
        <div className="max-w-2xl">
          <VeriHeading>
            Homes and landlords managed with <VeriEm>clarity</VeriEm>
          </VeriHeading>
          <p className="mt-6 text-lg leading-relaxed text-white/70">{siteContent.about.summary}</p>
          <Button
            asChild
            className="mt-8 rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
            size="lg"
          >
            <Link href="/about">
              About Veri
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-10 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          {siteContent.about.highlights.map((item) => (
            <div key={item.title}>
              <h3 className="font-[family-name:var(--font-veri-sans)] text-lg font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{item.description}</p>
            </div>
          ))}
        </div>
      </VeriSection>

      <VeriSection tone="muted">
        <VeriHeading>How we can help</VeriHeading>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Whether you own the property or live in it, Veri keeps the journey simple.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <Link
            href="/landlords"
            className="group block border-b border-foreground/15 pb-8 transition-colors hover:border-[var(--accent)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Landlords
            </p>
            <h3 className="mt-3 font-[family-name:var(--font-veri-sans)] text-2xl font-semibold tracking-tight">
              Full management with fees you can follow
            </h3>
            <p className="mt-3 text-muted-foreground">
              Marketing, referencing, rent collection, repairs, and compliance — handled remotely.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-[oklch(0.45_0.06_55)]">
              Landlord services
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </span>
          </Link>
          <Link
            href="/tenants"
            className="group block border-b border-foreground/15 pb-8 transition-colors hover:border-[var(--accent)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tenants
            </p>
            <h3 className="mt-3 font-[family-name:var(--font-veri-sans)] text-2xl font-semibold tracking-tight">
              Homes with support that stays with you
            </h3>
            <p className="mt-3 text-muted-foreground">
              Clear guidance from enquiry to move-in, plus email-first help throughout your tenancy.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-[oklch(0.45_0.06_55)]">
              Tenant services
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </span>
          </Link>
        </div>
      </VeriSection>

      <section className="relative overflow-hidden bg-[#141414] py-24 text-white md:py-28">
        <Image
          src={VERI_HERO_SRC}
          alt=""
          fill
          className="object-cover object-[center_42%] opacity-35"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#141414]/80" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <VeriHeading as="h2" className="text-white md:text-5xl">
            Start with a <VeriEm>conversation</VeriEm>
          </VeriHeading>
          <p className="mt-5 text-white/70">
            We&apos;re fully remote — email {name} at {email} and we&apos;ll take it from there.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[var(--accent)] text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
            >
              <a href={`mailto:${email}`}>
                Email us
                <ArrowUpRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/contact">Contact form</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
