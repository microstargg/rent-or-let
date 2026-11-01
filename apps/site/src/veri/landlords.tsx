import type { TenantConfig } from "@repo/config";
import { ActionLink, Line, PageHead, TickList } from "./ui";

export function VeriLandlords({ tenant }: { tenant: TenantConfig }) {
  const { landlords, contact, memberships } = tenant.site;
  const [fullManagement] = landlords.fees.items[0]?.fees ?? [];

  return (
    <>
      <PageHead
        title={landlords.hero.title}
        lead={landlords.hero.subtitle}
        aside={
          fullManagement ? (
            <div className="border-t-2 border-[var(--v-ink)] pt-4">
              <p className="v-label">{fullManagement.label}</p>
              <p className="v-num mt-2 text-[clamp(2.5rem,1.6rem+3vw,4.25rem)] font-medium leading-none">
                {fullManagement.amount.replace(/\s+of\s.*$/i, "")}
              </p>
              <p className="mt-2 text-[var(--v-muted)]">of rents collected. {fullManagement.note}</p>
            </div>
          ) : null
        }
      />

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-12">
          <div className="v-prose col-span-12 text-[1.0625rem] lg:col-span-6">
            {landlords.intro.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <h2 className="v-h3">What we manage for you</h2>
            <TickList className="mt-4 border-t-2 border-[var(--v-ink)]" items={landlords.services} />
          </div>
        </div>
      </section>

      <section className="v-dark v-section">
        <div className="v-wrap v-grid gap-y-8">
          <h2 className="v-h2 col-span-12 lg:col-span-5">Contractors and emergency cover</h2>
          <p className="v-lead col-span-12 max-w-none! lg:col-span-6 lg:col-start-7">{landlords.contractors}</p>
        </div>
      </section>

      {/* The signature at full length: the whole fee schedule, itemised. */}
      <section id="fees" className="v-section scroll-mt-[var(--v-head)]">
        <div className="v-wrap v-grid gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--v-head)+2.5rem)]">
              <h2 className="v-h2">Every landlord fee</h2>
              <p className="v-lead mt-5">{landlords.fees.summary}</p>
              <p className="mt-5 text-[var(--v-muted)]">
                Members of the {memberships.slice(0, 2).join(" and ")}.
              </p>
            </div>
          </div>
          <div className="col-span-12 space-y-14 lg:col-span-7 lg:col-start-6">
            {landlords.fees.items.map((group) => (
              <div key={group.category} className="v-statement" data-tick>
                <h3 className="v-statement__title">
                  <span>{group.category}</span>
                </h3>
                <ul>
                  {group.fees.map((fee, index) => (
                    <Line key={fee.label} i={index} label={fee.label} amount={fee.amount} note={fee.note} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="v-section border-t border-[var(--v-line)]">
        <div className="v-wrap v-grid gap-y-8">
          <h2 className="v-h2 col-span-12 lg:col-span-7">Thinking of moving your property to us?</h2>
          <div className="col-span-12 lg:col-span-5 lg:self-end">
            <p className="text-[var(--v-muted)]">
              New let or an existing tenancy, tell us about the property and we&apos;ll set out what happens next.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionLink href={`mailto:${contact.email}`} variant="pen">
                Email {contact.email}
              </ActionLink>
              <ActionLink href="/contact" variant="ghost">
                Contact form
              </ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
