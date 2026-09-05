import Link from "next/link";
import { getTenant } from "@repo/config/server";
import { SiteLogo } from "@/components/brand/site-logo";

export function SiteFooter() {
  const { site: siteContent, name } = getTenant();
  const { address, phone, hours, email } = siteContent.contact;

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
              {hours.map(({ day, hours: h }) => (
                <li key={day}>
                  {day}: {h}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Contact</h3>
            <p className="text-sm text-muted-foreground">Fully remote — email us anytime.</p>
          </div>
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
