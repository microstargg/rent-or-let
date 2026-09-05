import Link from "next/link";
import { headers } from "next/headers";
import { hostnameOf, isSharedPreviewHost } from "@repo/config/host";
import { getTenant } from "@/lib/tenant";
import { SiteLogo } from "@/components/brand/site-logo";

export async function SiteFooter() {
  const { site: siteContent, name, id } = await getTenant();
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

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <SiteLogo href="/" size="sm" />
          {address ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {address.line1}
              <br />
              {address.line2}
              <br />
              {address.city}, {address.postcode}
            </p>
          ) : null}
        </div>
        {hours && hours.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Opening hours</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {hours.map(({ day, hours: dayHours }) => (
                <li key={day}>
                  {day}: {dayHours}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div />
        )}
        <div>
          <h3 className="mb-3 text-sm font-semibold">Contact</h3>
          <p className="text-sm text-muted-foreground">
            {phone ? (
              <>
                <a className="hover:text-foreground" href={`tel:${phone.replace(/\s/g, "")}`}>
                  {phone}
                </a>
                <br />
              </>
            ) : null}
            <a className="hover:text-foreground" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">{legalLinks}</nav>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {name}. All rights reserved.
      </div>
    </footer>
  );
}
