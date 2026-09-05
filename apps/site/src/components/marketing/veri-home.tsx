import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TenantConfig } from "@repo/config";

export function VeriHome({ tenant }: { tenant: TenantConfig }) {
  const { site: siteContent, name } = tenant;
  const email = siteContent.contact.email;

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden bg-[#141414] text-white">
        <Image
          src="/agencies/veri-properties/hero.jpg"
          alt=""
          fill
          priority
          className="veri-hero-image object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414]/90 via-[#141414]/35 to-[#141414]/25" />

        <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-4 pb-16 pt-28 md:px-8 md:pb-20 lg:px-12">
          <p
            aria-hidden
            className="veri-fade-up pointer-events-none absolute inset-x-0 top-[28%] select-none text-center font-[family-name:var(--font-veri-sans)] text-[clamp(4rem,18vw,13rem)] font-extrabold leading-none tracking-tight text-white/90"
          >
            VERI
          </p>

          <div className="veri-fade-up-delay relative mx-auto w-full max-w-3xl text-center">
            <h1 className="font-[family-name:var(--font-veri-sans)] text-3xl font-semibold tracking-tight md:text-5xl">
              Property management, done{" "}
              <em className="font-[family-name:var(--font-veri-serif)] font-normal italic text-[var(--accent)]">
                clearly
              </em>
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

      <section className="border-b border-border/60 bg-background py-10">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Regulated and protected
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-foreground/80">
            {siteContent.memberships.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-veri-sans)] text-3xl font-bold tracking-tight md:text-4xl">
            Built for landlords and tenants who want{" "}
            <em className="font-[family-name:var(--font-veri-serif)] font-normal italic text-foreground/70">
              clarity
            </em>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {siteContent.about.summary}
          </p>
          <Button asChild className="mt-8 rounded-full" size="lg">
            <Link href="/about">
              About Veri
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {siteContent.about.highlights.map((item) => (
            <div key={item.title}>
              <h3 className="font-[family-name:var(--font-veri-sans)] text-lg font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/50 py-20 md:py-24">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="font-[family-name:var(--font-veri-sans)] text-3xl font-bold tracking-tight md:text-4xl">
            How we can help
          </h2>
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
              <h3 className="mt-3 font-[family-name:var(--font-veri-sans)] text-2xl font-semibold tracking-tight group-hover:text-foreground">
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
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#141414] py-24 text-white md:py-28">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(/agencies/veri-properties/hero.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[#141414]/75" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
          <h2 className="font-[family-name:var(--font-veri-sans)] text-3xl font-bold tracking-tight md:text-5xl">
            Start with a{" "}
            <em className="font-[family-name:var(--font-veri-serif)] font-normal italic text-[var(--accent)]">
              conversation
            </em>
          </h2>
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
