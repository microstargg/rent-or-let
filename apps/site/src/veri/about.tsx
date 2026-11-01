import type { TenantConfig } from "@repo/config";
import { ActionLink, Line, PageHead } from "./ui";

export function VeriAbout({ tenant }: { tenant: TenantConfig }) {
  const { about, memberships, deposits, cmp, contact } = tenant.site;

  return (
    <>
      <PageHead title="About Veri" lead={about.summary} />

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-12">
          <div className="v-prose col-span-12 text-[1.0625rem] lg:col-span-6">
            {about.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <h2 className="v-h3">What we hold ourselves to</h2>
            <ul className="mt-4 border-t-2 border-[var(--v-ink)]" data-tick>
              {about.highlights.map((item, index) => (
                <Line key={item.title} i={index} label={item.title} note={item.description} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="v-dark v-section">
        <div className="v-wrap v-grid gap-y-10">
          <h2 className="v-h2 col-span-12 lg:col-span-5">Regulated and protected</h2>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <ul className="border-t border-[var(--v-line)]" data-tick>
              {memberships.map((membership, index) => (
                <Line key={membership} i={index} label={membership} />
              ))}
            </ul>
            <p className="mt-6 text-[var(--v-muted)]">{deposits.note}</p>
            <p className="mt-4">
              <a href={cmp.certificateUrl} className="v-link font-semibold">
                Our client money protection certificate
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-8">
          <h2 className="v-h2 col-span-12 lg:col-span-7">Landlord or tenant, start with an email.</h2>
          <div className="col-span-12 flex flex-wrap gap-3 lg:col-span-5 lg:self-end lg:justify-end">
            <ActionLink href="/landlords">For landlords</ActionLink>
            <ActionLink href="/tenants" variant="ghost">
              For tenants
            </ActionLink>
            <ActionLink href={`mailto:${contact.email}`} variant="pen">
              Email {contact.email}
            </ActionLink>
          </div>
        </div>
      </section>
    </>
  );
}
