import Link from "next/link";
import { headers } from "next/headers";
import { hostnameOf, isSharedPreviewHost } from "@repo/config/host";
import { getSiteAgency } from "@/lib/agency";
import { portalLoginUrl } from "@/lib/platform";
import { Wordmark } from "./ui";

export async function VeriFooter() {
  const agency = await getSiteAgency();
  const { site, name } = agency.config;
  const email = site.contact.email;
  const h = await headers();
  const showSiteSwitcher = isSharedPreviewHost(hostnameOf(h.get("x-forwarded-host") ?? h.get("host")));

  const columns: Array<{ title: string; links: Array<{ href: string; label: string; external?: boolean }> }> = [
    {
      title: "Lettings",
      links: [
        { href: "/properties", label: "Homes to let" },
        { href: "/landlords", label: "Landlords" },
        { href: "/tenants", label: "Tenants" },
        { href: "/apply", label: "Apply to rent" },
        { href: "/about", label: "About Veri" },
        { href: "/contact", label: "Contact" },
      ],
    },
    {
      title: "Portals",
      links: [
        { href: portalLoginUrl(agency, "/portal"), label: "Tenant login", external: true },
        { href: portalLoginUrl(agency, "/landlord-portal"), label: "Landlord login", external: true },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/legal/privacy", label: "Privacy" },
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/cmp", label: "Client money protection" },
        { href: "/complaints", label: "Complaints" },
        ...(showSiteSwitcher ? [{ href: "/preview", label: "Switch site" }] : []),
      ],
    },
  ];

  return (
    <footer className="v-dark">
      <div className="v-wrap pb-10 pt-16 md:pt-24">
        <p className="v-label">Write to the team</p>
        <a
          href={`mailto:${email}`}
          className="v-link mt-3 inline-block break-all text-[clamp(1.9rem,0.8rem+5vw,5.5rem)] font-[800] leading-[0.95] tracking-[-0.045em] [font-stretch:120%]"
        >
          {email}
        </a>
        <p className="mt-5 max-w-[46ch] text-[var(--v-muted)]">
          We&apos;re fully remote, so email is the quickest way to reach us. We answer on working days.
        </p>

        <div className="mt-16 grid gap-10 border-t border-[var(--v-line)] pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="v-label">{column.title}</h2>
              <ul className="mt-4 space-y-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a href={link.href} className="inline-block py-1 transition-colors hover:text-[var(--v-pen-ink)]">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="inline-block py-1 transition-colors hover:text-[var(--v-pen-ink)]">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="v-label">Regulated and protected</h2>
            <ul className="mt-4 space-y-2 text-[0.95rem]">
              {site.memberships.map((membership) => (
                <li key={membership}>{membership}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-end justify-between gap-6 border-t border-[var(--v-line)] pt-8">
          <span className="text-[3.25rem]">
            <Wordmark id="vf" />
          </span>
          <p className="text-sm text-[var(--v-muted)]">
            © {new Date().getFullYear()} {name}. Fully remote lettings across the UK.
          </p>
        </div>
      </div>
    </footer>
  );
}
