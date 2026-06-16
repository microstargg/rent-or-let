import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { siteContent } from "@/lib/content/site";

export function SiteFooter() {
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
          <h2 className="font-semibold">Office hours</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {siteContent.contact.hours.map(({ day, hours }) => (
              <li key={day}>
                {day}: {hours}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Contact</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tel:{" "}
            <a
              href={`tel:${siteContent.contact.phone.replace(/\s/g, "")}`}
              className="hover:text-primary"
            >
              {siteContent.contact.phone}
            </a>
          </p>
          <p className="mt-4 text-sm">
            <Link href="/legal/privacy" className="hover:text-primary">
              Privacy Notice
            </Link>
            {" · "}
            <Link href="/legal/terms" className="hover:text-primary">
              Terms & Conditions
            </Link>
            {" · "}
            <Link href="/legal/cmp" className="hover:text-primary">
              Client Money Protection
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Property Management Services. All rights reserved.
      </div>
    </footer>
  );
}
