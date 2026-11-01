import Link from "next/link";
import type { TenantConfig } from "@repo/config";
import { ContactForm } from "@/components/forms/contact-form";
import { TickList } from "./ui";

export function VeriContact({ tenant }: { tenant: TenantConfig }) {
  const { email } = tenant.site.contact;

  return (
    <>
      <header className="border-b border-[var(--v-line)]">
        <div className="v-wrap pb-12 pt-12 md:pb-16 md:pt-20">
          <h1 className="v-display v-display--page">Email the team</h1>
          <a
            href={`mailto:${email}`}
            className="v-link mt-8 inline-block break-all text-[clamp(1.6rem,0.9rem+3.4vw,3.75rem)] font-[760] leading-none tracking-[-0.035em] [font-stretch:115%]"
          >
            {email}
          </a>
          <p className="v-lead mt-6">
            We&apos;re fully remote, so there are no office hours and no phone line. We aim to reply within one
            working day.
          </p>
        </div>
      </header>

      <section className="v-section">
        <div className="v-wrap v-grid gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <h2 className="v-h3">Worth including</h2>
            <TickList
              className="mt-4 border-t-2 border-[var(--v-ink)]"
              items={[
                "The property address, if it's about a home",
                "Whether you're a landlord, a tenant or applying",
                "The best email to reach you on",
              ]}
            />
            <p className="mt-8 text-[var(--v-muted)]">
              Unhappy with our service? Use our{" "}
              <Link href="/complaints" className="v-link">
                complaints form
              </Link>
              .
            </p>
          </div>
          <div className="col-span-12 border-t-2 border-[var(--v-ink)] bg-[var(--v-white)] p-6 md:p-8 lg:col-span-7 lg:col-start-6">
            <h2 className="v-h3">Send a message</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
