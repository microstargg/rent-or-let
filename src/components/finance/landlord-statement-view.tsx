import { siteContent } from "@/lib/content/site";
import {
  formatStatementIssuedAt,
  formatStatementMoney,
} from "@/lib/finance/statement-format";
import type { LandlordStatementPdfInput } from "@/lib/pdf/landlord-statement";
import { cn } from "@/lib/utils";

function AmountRow({
  label,
  value,
  bold,
  indent,
  abs,
}: {
  label: string;
  value: number | undefined;
  bold?: boolean;
  indent?: boolean;
  abs?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-6 py-1",
        bold && "font-semibold",
        indent && "pl-4 text-sm text-neutral-700"
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatStatementMoney(value, { abs })}</span>
    </div>
  );
}

export function LandlordStatementView({
  landlordName,
  periodFrom,
  periodTo,
  totals,
  issuedAt,
  agencyName,
}: LandlordStatementPdfInput) {
  const agency = agencyName ?? siteContent.contact.address.line1 ?? "Property Management Services";
  const properties = totals.properties ?? [];

  return (
    <article className="mx-auto max-w-2xl bg-white px-6 py-8 text-neutral-900 shadow-sm ring-1 ring-black/10 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0 sm:px-10 sm:py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Landlord statement
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{agency}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {siteContent.contact.address.line2}, {siteContent.contact.address.city}{" "}
          {siteContent.contact.address.postcode}
        </p>
        <p className="text-sm text-neutral-600">
          Tel {siteContent.contact.phone} · {siteContent.contact.email}
        </p>
      </header>

      <hr className="my-6 border-neutral-300" />

      <p className="text-lg font-semibold">{landlordName || "—"}</p>
      <p className="mt-1 text-sm text-neutral-700">
        Period {periodFrom} to {periodTo}
      </p>
      <p className="text-sm text-neutral-700">Issued {formatStatementIssuedAt(issuedAt)}</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Portfolio summary
        </h2>
        <div className="mt-3 space-y-0.5">
          <AmountRow label="Rent received" value={totals.rent} />
          <AmountRow label="Management fees" value={totals.fees} />
          <AmountRow label="Maintenance / costs" value={totals.costs} />
          <AmountRow label="Adjustments" value={totals.adjustments} />
          <hr className="my-2 border-neutral-300" />
          <AmountRow label="Net due to landlord" value={totals.net} bold />
        </div>
      </section>

      {properties.map((property) => (
        <section key={property.id ?? property.address} className="mt-8">
          <h2 className="text-base font-semibold">{property.address || "Property"}</h2>
          <div className="mt-3 space-y-0.5">
            <AmountRow label="Rent received" value={property.rent} />
            <AmountRow label="Management fee" value={property.fees} />
            {property.works.length > 0 && (
              <>
                <p className="pt-2 text-sm font-semibold">Works</p>
                {property.works.map((work, index) => (
                  <AmountRow
                    key={`${work.dated}-${work.summary}-${index}`}
                    label={`${work.dated}  ${work.summary}`}
                    value={work.amount}
                    indent
                    abs
                  />
                ))}
              </>
            )}
            {property.adjustments ? (
              <AmountRow label="Adjustments" value={property.adjustments} />
            ) : null}
            <hr className="my-2 border-neutral-300" />
            <AmountRow label="Property net" value={property.net} bold />
          </div>
        </section>
      ))}

      {!properties.length && totals.works?.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Works</h2>
          <div className="mt-3 space-y-0.5">
            {totals.works.map((work, index) => (
              <AmountRow
                key={`${work.dated}-${work.summary}-${index}`}
                label={[work.dated, work.address, work.summary].filter(Boolean).join("  ")}
                value={work.amount}
                abs
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <hr className="mb-3 border-neutral-300" />
        <AmountRow label="Total net due to landlord" value={totals.net} bold />
        <p className="mt-6 text-xs leading-relaxed text-neutral-500">
          This statement is generated from the landlord ledger for the dates above. Positive net is
          owed to the landlord; negative means the landlord owes the agency.
        </p>
      </section>
    </article>
  );
}
