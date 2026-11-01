import Image from "next/image";
import Link from "next/link";
import type { TenantConfig } from "@repo/config";
import { tryFetchListings } from "@/lib/platform";
import { VERI_HERO_SRC } from "@/lib/veri";
import { VeriCard } from "./card";
import { ActionLink, Line, Tick } from "./ui";

/** Pull the leading figure out of a fee string, e.g. "£180.00 + VAT per property" → "£180 + VAT". */
function shortFee(amount: string): string {
  return amount.replace(/\.00/g, "").replace(/\s+(per|of)\s.*$/i, "");
}

export async function VeriHome({ tenant }: { tenant: TenantConfig }) {
  const { site, name, domain } = tenant;
  const email = site.contact.email;
  const listings = await tryFetchListings();
  const homes = (listings ?? []).slice(0, 3);
  const managementFees = site.landlords.fees.items[0]?.fees ?? [];
  const [fullManagement] = managementFees;
  const services = site.landlords.services;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name,
    url: domain,
    email,
    description: site.hero.subtitle,
    areaServed: "GB",
    memberOf: site.memberships.map((membership) => ({ "@type": "Organization", name: membership })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: the headline is the brand promise; the slip beside the photo proves it. */}
      <section className="overflow-hidden">
        <div className="v-wrap pb-14 pt-10 md:pb-24 md:pt-16">
          <h1 className="v-display v-display--hero">
            Lettings,
            <br />
            itemised.
          </h1>
          <div className="v-grid mt-10 gap-y-10 md:mt-14">
            <div className="col-span-12 md:col-span-5 md:pt-2">
              <p className="v-lead">{site.hero.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ActionLink href="/properties">See homes to let</ActionLink>
                <ActionLink href="/landlords" variant="ghost">
                  Landlord fees
                </ActionLink>
              </div>
            </div>
            <div className="relative col-span-12 md:col-span-7">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius)] bg-[#e3e6e0]">
                <Image
                  src={VERI_HERO_SRC}
                  alt="A red-brick house with black and white gables behind a wooden fence"
                  fill
                  priority
                  sizes="(min-width: 768px) 56vw, 100vw"
                  className="object-cover object-[center_45%]"
                />
              </div>
              <div
                className="v-statement relative -mt-16 ml-auto w-[min(100%,25rem)] bg-[var(--v-white)] p-5 shadow-[0_24px_60px_-30px_rgba(18,20,23,0.45)] md:absolute md:-bottom-10 md:-left-12 md:mt-0 md:ml-0"
                data-tick
              >
                <p className="v-statement__title">
                  <span>What a landlord pays</span>
                </p>
                <ul>
                  {managementFees.map((fee, index) => (
                    <Line key={fee.label} i={index} label={fee.label} amount={shortFee(fee.amount)} />
                  ))}
                </ul>
                <Link href="/landlords#fees" className="v-link mt-3 inline-block py-1 text-[0.95rem] font-semibold">
                  Every other fee, in full
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Homes to let, live from the platform. */}
      <section className="v-section border-t border-[var(--v-line)] bg-[var(--v-white)]">
        <div className="v-wrap">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="v-h2">Homes to let</h2>
              <p className="mt-3 text-[var(--v-muted)]">
                {listings === null
                  ? "Our listings are taking a moment to load. Try again shortly."
                  : listings.length === 0
                    ? "Nothing listed this week."
                    : `${listings.length} ${listings.length === 1 ? "home" : "homes"} listed right now, each managed by us from move-in to check-out.`}
              </p>
            </div>
            {listings && listings.length > 0 ? (
              <ActionLink href="/properties" variant="ghost">
                All homes to let
              </ActionLink>
            ) : null}
          </div>
          {homes.length > 0 ? (
            <div className="mt-10 grid gap-x-[var(--v-gutter)] gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {homes.map((home) => (
                <VeriCard key={home.id} property={home} />
              ))}
            </div>
          ) : (
            <p className="mt-8 max-w-[52ch] border-t border-[var(--v-line)] pt-6">
              New homes go up here as soon as they&apos;re ready to view. Email{" "}
              <a href={`mailto:${email}`} className="v-link font-semibold">
                {email}
              </a>{" "}
              and we&apos;ll tell you what&apos;s coming up.
            </p>
          )}
        </div>
      </section>

      {/* Signature: what full management covers, ticked off line by line. */}
      <section className="v-section border-t border-[var(--v-line)]">
        <div className="v-wrap v-grid gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-[calc(var(--v-head)+2.5rem)]">
              <h2 className="v-h2">What we manage for you</h2>
              <p className="v-lead mt-5">{site.landlords.fees.summary}</p>
              <div className="mt-8">
                <ActionLink href="/landlords">Landlord services</ActionLink>
              </div>
            </div>
          </div>
          <div className="v-statement col-span-12 lg:col-span-6 lg:col-start-7" data-tick>
            <p className="v-statement__title">
              <span>Full management, as standard</span>
            </p>
            <ul>
              {services.map((service, index) => (
                <Line key={service} i={index} label={service} />
              ))}
              {fullManagement ? (
                <Line
                  total
                  i={services.length}
                  label={fullManagement.label}
                  amount={fullManagement.amount}
                />
              ) : null}
            </ul>
          </div>
        </div>
      </section>

      {/* For tenants: what is checked before anyone moves in. */}
      <section className="v-dark v-section">
        <div className="v-wrap">
          <h2 className="v-h2 max-w-[18ch]">Checked before you get the keys</h2>
          <ul className="mt-12 border-t border-[var(--v-line)]" data-tick>
            {site.tenants.trustPoints.map((point, index) => (
              <li
                key={point.title}
                className="grid gap-x-[var(--v-gutter)] gap-y-2 border-b border-[var(--v-line)] py-7 md:grid-cols-12 md:items-baseline"
              >
                <span className="flex items-baseline gap-3 text-[clamp(1.5rem,1rem+2vw,2.6rem)] font-[760] leading-[1.05] tracking-[-0.03em] [font-stretch:118%] md:col-span-6">
                  <Tick i={index} className="translate-y-[0.12em]" />
                  {point.title}
                </span>
                <span className="text-[var(--v-muted)] md:col-span-5 md:col-start-8">{point.description}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <ActionLink href="/tenants">Renting with Veri</ActionLink>
          </div>
        </div>
      </section>

      {/* Two doors. */}
      <section className="v-section pb-0!">
        <div className="v-wrap">
          <h2 className="sr-only">Who we work with</h2>
          <div className="border-t border-[var(--v-line)]">
            <Link href="/landlords" className="v-door v-hover">
              <span>
                <span className="v-door__name block">Landlords</span>
                <span className="v-door__sub block">{site.landlords.hero.subtitle}</span>
              </span>
              <Tick hover box />
            </Link>
            <Link href="/tenants" className="v-door v-hover">
              <span>
                <span className="v-door__name block">Tenants</span>
                <span className="v-door__sub block">{site.tenants.hero.subtitle}</span>
              </span>
              <Tick hover box />
            </Link>
          </div>
        </div>
      </section>

      {/* Remote by design. */}
      <section className="v-section">
        <div className="v-wrap v-grid gap-y-8">
          <p className="col-span-12 text-[clamp(2rem,1rem+4.4vw,5rem)] font-[800] leading-[0.95] tracking-[-0.045em] [font-stretch:122%] lg:col-span-9">
            No shop front. No phone queue. One inbox that gets answered.
          </p>
          <div className="col-span-12 lg:col-span-5">
            <p className="v-lead">{site.about.paragraphs[2]}</p>
          </div>
          <div className="col-span-12 flex flex-wrap items-center gap-3 lg:col-span-6 lg:col-start-7 lg:justify-end lg:self-end">
            <ActionLink href={`mailto:${email}`} variant="pen">
              Email {email}
            </ActionLink>
            <ActionLink href="/contact" variant="ghost">
              Use the contact form
            </ActionLink>
          </div>
        </div>
      </section>
    </>
  );
}
