import type { TenantConfig } from "@repo/config";
import { ActionLink, Line, PageHead, TickList } from "./ui";

export function VeriTenants({ tenant }: { tenant: TenantConfig }) {
  const { tenants, fees, contact, deposits } = tenant.site;

  return (
    <>
      <PageHead title={tenants.hero.title} lead={tenants.hero.subtitle}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ActionLink href="/properties">See homes to let</ActionLink>
          <ActionLink href="/apply" variant="ghost">
            Apply to rent
          </ActionLink>
        </div>
      </PageHead>

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="v-h2">Before you move in</h2>
            <p className="v-lead mt-5">{tenants.intro}</p>
          </div>
          <ul className="col-span-12 border-t-2 border-[var(--v-ink)] lg:col-span-6 lg:col-start-7" data-tick>
            {tenants.trustPoints.map((point, index) => (
              <Line key={point.title} i={index} label={point.title} note={point.description} />
            ))}
          </ul>
        </div>
      </section>

      {/* A real sequence, so it is numbered. */}
      <section className="v-dark v-section">
        <div className="v-wrap">
          <h2 className="v-h2">{tenants.securingProperty.title}</h2>
          <ol className="mt-12 grid gap-x-[var(--v-gutter)] gap-y-10 md:grid-cols-3">
            {tenants.securingProperty.steps.map((step, index) => (
              <li key={step.title} className="border-t border-[var(--v-line)] pt-5">
                <span className="v-num block text-[3.5rem] font-medium leading-none text-[var(--v-pen-ink)]">
                  {index + 1}
                </span>
                <h3 className="v-h3 mt-5">{step.title}</h3>
                <p className="mt-3 text-[var(--v-muted)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-14">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="v-h3">{tenants.choosingArea.title}</h2>
            <p className="mt-4 text-[var(--v-muted)]">{tenants.choosingArea.intro}</p>
            <TickList className="mt-4" items={tenants.choosingArea.points} />
          </div>
          <div className="v-prose col-span-12 lg:col-span-6 lg:col-start-7">
            <h2 className="v-h3 text-[var(--v-ink)]">{tenants.findingProperty.title}</h2>
            {tenants.findingProperty.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
            <p className="text-[var(--v-ink)]">{tenants.benefits}</p>
          </div>
        </div>
      </section>

      <section id="fees" className="v-section border-t border-[var(--v-line)] bg-[var(--v-white)]">
        <div className="v-wrap v-grid gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <h2 className="v-h2">What you may pay</h2>
            <p className="mt-5 text-[var(--v-muted)]">
              In England, the Tenant Fees Act limits what a letting agent can charge you. These are the payments we can ask for.{" "}
              <a href={fees.permittedPaymentsUrl} className="v-link" target="_blank" rel="noopener noreferrer">
                Read the government&apos;s How to Rent guide (opens in a new tab)
              </a>
              .
            </p>
          </div>
          <div className="v-statement col-span-12 lg:col-span-7 lg:col-start-6" data-tick>
            <p className="v-statement__title">
              <span>Permitted payments</span>
            </p>
            <ul>
              <Line i={0} label="Holding deposit" note={fees.holdingDepositNote} />
              <Line i={1} label="Tenancy deposit" note={fees.tenancyDepositNote} />
              {tenants.permittedPayments.map((payment, index) => (
                <Line key={payment.slice(0, 40)} i={index + 2} label={payment} />
              ))}
            </ul>
            <p className="mt-5 text-[0.95rem] text-[var(--v-muted)]">{deposits.note}</p>
          </div>
        </div>
      </section>

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-14">
          <div className="col-span-12 lg:col-span-6">
            <h2 className="v-h3">{tenants.livingInHome.title}</h2>
            <p className="mt-4 text-[var(--v-muted)]">{tenants.livingInHome.intro}</p>
            <ul className="mt-6 border-t-2 border-[var(--v-ink)]">
              {tenants.livingInHome.points.map((point) => (
                <Line key={point.title} tick={false} label={point.title} note={point.description} />
              ))}
            </ul>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <h2 className="v-h3">{tenants.responsibilities.title}</h2>
            <p className="mt-4 text-[var(--v-muted)]">{tenants.responsibilities.intro}</p>
            <TickList className="mt-4" items={tenants.responsibilities.points} />
            <p className="mt-6 text-[var(--v-muted)]">{tenants.responsibilities.outro}</p>
          </div>
        </div>
      </section>

      <section className="v-section border-t border-[var(--v-line)]">
        <div className="v-wrap v-grid gap-y-8">
          <h2 className="v-h2 col-span-12 lg:col-span-7">Found somewhere you like?</h2>
          <div className="col-span-12 lg:col-span-5 lg:self-end">
            <p className="text-[var(--v-muted)]">{tenants.confidentiality}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionLink href="/apply" variant="pen">
                Apply to rent
              </ActionLink>
              <ActionLink href={`mailto:${contact.email}`} variant="ghost">
                Email a question
              </ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
