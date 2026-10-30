import Link from "next/link";
import { headers } from "next/headers";
import { hostnameOf, isSharedPreviewHost } from "@repo/config/host";
import { getSiteAgency } from "@/lib/agency";
import { portalLoginUrl } from "@/lib/platform";
import { SiteLogo } from "@/components/brand/site-logo";

export async function SiteFooter() {
  const agency = await getSiteAgency();
  const { site: siteContent, name, id } = agency.config;
  const tenantPortalUrl = portalLoginUrl(agency, "/portal");
  const landlordPortalUrl = portalLoginUrl(agency, "/landlord-portal");
  const h = await headers();
  const host = hostnameOf(h.get("x-forwarded-host") ?? h.get("host"));
  const showSiteSwitcher = isSharedPreviewHost(host);
  const { address, phone, hours, email } = siteContent.contact;
  const isVeri = id === "veri-properties";

  const legalLinks = (
    <>
      <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">
        Privacy
      </Link>
      <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">
        Terms
      </Link>
      <Link href="/legal/cmp" className="text-muted-foreground hover:text-foreground">
        CMP
      </Link>
      <Link href="/complaints" className="text-muted-foreground hover:text-foreground">
        Complaints
      </Link>
      {showSiteSwitcher && (
        <Link href="/preview" className="text-muted-foreground hover:text-foreground">
          Switch site
        </Link>
      )}
    </>
  );

  if (isVeri) {
    return (
      <footer className="relative overflow-hidden bg-[#141414] text-white">
        <div className="container relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-16">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold tracking-tight">Veri Properties</p>
              <p className="mt-3 text-sm text-white/55">Fully remote UK lettings.</p>
              <a
                href={`mailto:${email}`}
                className="mt-4 inline-block text-sm text-[var(--accent)] transition-colors hover:text-white"
              >
                {email}
              </a>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Navigation
              </h3>
              <nav className="flex flex-col gap-2 text-sm text-white/70">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <Link href="/properties" className="hover:text-white">
                  Properties
                </Link>
                <Link href="/landlords" className="hover:text-white">
                  Landlords
                </Link>
                <Link href="/tenants" className="hover:text-white">
                  Tenants
                </Link>
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
                <a href={tenantPortalUrl} className="hover:text-white">
                  Tenant login
                </a>
                <a href={landlordPortalUrl} className="hover:text-white">
                  Landlord login
                </a>
              </nav>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                Legal
              </h3>
              <nav className="flex flex-col gap-2 text-sm text-white/70 [&_a]:text-white/70 [&_a:hover]:text-white">
                {legalLinks}
              </nav>
            </div>
          </div>
          <p className="mt-12 text-xs text-white/35">
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
        </div>
        <div
          aria-hidden
          className="pointer-events-none select-none overflow-hidden pb-0 pt-4 text-center font-[family-name:var(--font-veri-sans)] text-[clamp(4.5rem,18vw,14rem)] font-bold leading-none tracking-tight text-transparent"
          style={{ WebkitTextStroke: "1px rgba(255,255,255,0.18)" }}
        >
          VERI
        </div>
      </footer>
    );
  }

  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : null;
  const linkClass = "block py-1 text-white/75 transition-colors hover:text-white";
  const weekdays = hours?.filter(({ hours: dayHours }) => /\d/.test(dayHours)) ?? [];
  const sameHours = weekdays.length > 1 && weekdays.every(({ hours: h }) => h === weekdays[0].hours);
  const hoursSummary = sameHours
    ? `${weekdays[0].day.slice(0, 3)} – ${weekdays[weekdays.length - 1].day.slice(0, 3)} ${weekdays[0].hours}`
    : null;

  return (
    <footer className="bg-[var(--ink)] text-white/70">
      <div className="container mx-auto max-w-6xl px-4 pb-8 pt-14 md:pt-18">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/55">
              {tel ? "Talk to the office" : "Get in touch"}
            </p>
            {tel ? (
              <a
                href={tel}
                className="mt-2 block text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-none tracking-[-0.035em] text-white tabular-nums transition-opacity hover:opacity-85"
              >
                {phone}
              </a>
            ) : (
              <a
                href={`mailto:${email}`}
                className="mt-2 block break-all text-[clamp(1.75rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.03em] text-white"
              >
                {email}
              </a>
            )}
          </div>
          {tel ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex h-11 items-center self-start rounded-md bg-white px-5 text-[15px] font-semibold text-[var(--ink)] transition-colors hover:bg-white/90 md:self-auto"
            >
              {email}
            </a>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-8 pt-10 text-[15px] md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-white">{name}</h2>
            {address ? (
              <p>
                {address.line1 !== name ? (
                  <>
                    {address.line1}
                    <br />
                  </>
                ) : null}
                {address.line2}
                <br />
                {address.city} {address.postcode}
              </p>
            ) : null}
            {hours && hours.length > 0 ? (
              hoursSummary ? (
                <p className="mt-3 tabular-nums">{hoursSummary}</p>
              ) : (
                <ul className="mt-3 space-y-0.5 tabular-nums">
                  {hours.map(({ day, hours: dayHours }) => (
                    <li key={day}>
                      {day}: {dayHours}
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
          <nav aria-label="Renting">
            <h2 className="mb-3 text-sm font-semibold text-white">Renting</h2>
            <Link href="/properties" className={linkClass}>
              Homes to let
            </Link>
            <Link href="/apply" className={linkClass}>
              Apply to rent
            </Link>
            <Link href="/tenants" className={linkClass}>
              Tenant advice
            </Link>
            <a href={tenantPortalUrl} className={linkClass}>
              Tenant login
            </a>
          </nav>
          <nav aria-label="Landlords">
            <h2 className="mb-3 text-sm font-semibold text-white">Landlords</h2>
            <Link href="/landlords" className={linkClass}>
              Our services
            </Link>
            <Link href="/contact" className={linkClass}>
              Talk to us about letting
            </Link>
            <a href={landlordPortalUrl} className={linkClass}>
              Landlord login
            </a>
          </nav>
          <nav aria-label="Company">
            <h2 className="mb-3 text-sm font-semibold text-white">Company</h2>
            <Link href="/about" className={linkClass}>
              About
            </Link>
            <Link href="/contact" className={linkClass}>
              Contact
            </Link>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {name}
            {siteContent.cmp?.scheme ? ` · ${siteContent.cmp.scheme}` : ""}
          </p>
          <nav
            aria-label="Legal"
            className="flex flex-wrap gap-x-4 gap-y-1 [&_a]:text-white/60 [&_a:hover]:text-white"
          >
            {legalLinks}
          </nav>
        </div>
      </div>
    </footer>
  );
}
