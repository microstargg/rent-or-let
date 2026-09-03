import Link from "next/link";
import { getTenant } from "@repo/config";
import { SiteLogo } from "@/components/brand/site-logo";

export function SiteFooter() {
  const { site: siteContent, name } = getTenant();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <SiteLogo href="/" size="sm" />
          <p className="mt-2 text-sm text-muted-foreground">
            {siteContent.contact.address.line1}
            <br />
            {siteContent.contact.address.line2}
            <br />
            {siteContent.contact.address.city}, {siteContent.contact.address.postcode}
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Opening hours</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {siteContent.contact.hours.map(({ day, hours }) => (
              <li key={day}>
                {day}: {hours}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Contact</h3>
          <p className="text-sm text-muted-foreground">
            <a
              className="hover:text-foreground"
              href={`tel:${siteContent.contact.phone.replace(/\s/g, "")}`}
            >
              {siteContent.contact.phone}
            </a>
            <br />
            <a className="hover:text-foreground" href={`mailto:${siteContent.contact.email}`}>
              {siteContent.contact.email}
            </a>
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
          </nav>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {name}. All rights reserved.
      </div>
    </footer>
  );
}
