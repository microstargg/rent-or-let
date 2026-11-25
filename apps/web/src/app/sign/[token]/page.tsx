import type { Metadata } from "next";
import { getSignatureByToken } from "@/lib/db/queries/tenancy";
import { STANDARD_CLAUSES, type AgreementTerms } from "@/lib/tenancy/agreement";
import { SignAgreementForm } from "@/components/portal/sign-agreement-form";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign tenancy agreement", robots: { index: false } };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-2 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function SignAgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await getSignatureByToken(token);

  if (!found || found.agreement.status === "cancelled") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-bold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The agreement may have been replaced with a newer version. Ask your letting agent for a new link.
        </p>
      </main>
    );
  }

  const terms = found.agreement.terms as AgreementTerms;
  const me = found.signature;
  const pdfHref = `/api/agreements/${found.agreement.id}/pdf?token=${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-muted-foreground">{terms.agency.name}</p>
      <h1 className="mt-1 text-2xl font-bold">Tenancy agreement</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {terms.property.address}. Read the agreement, then sign at the bottom.{" "}
        <a href={pdfHref} className="text-primary underline">
          Download PDF
        </a>
      </p>

      <dl className="mt-6">
        <Row label="Landlord" value={terms.landlord.name} />
        <Row label="Tenants" value={terms.tenants.join(", ")} />
        {terms.guarantors.length > 0 && (
          <Row label="Guarantors" value={terms.guarantors.map((g) => g.name).join(", ")} />
        )}
        <Row label="Start date" value={new Date(`${terms.startDate}T00:00:00Z`).toLocaleDateString("en-GB")} />
        <Row
          label="Rent"
          value={`${formatCurrency(terms.rent.amount)} ${terms.rent.frequency === "weekly" ? "per week" : "per month"}`}
        />
        {terms.deposit.amount ? (
          <Row
            label="Deposit"
            value={`${formatCurrency(terms.deposit.amount)}${terms.deposit.scheme ? `, protected with ${terms.deposit.scheme}` : ""}`}
          />
        ) : null}
      </dl>

      <div className="mt-6 space-y-4 text-sm leading-relaxed">
        {STANDARD_CLAUSES.filter((c) => c.heading !== "Guarantors" || terms.guarantors.length).map((c) => (
          <section key={c.heading}>
            <h2 className="font-semibold">{c.heading}</h2>
            <p className="mt-1 text-muted-foreground">{c.text}</p>
          </section>
        ))}
        {terms.additionalTerms && (
          <section>
            <h2 className="font-semibold">Additional terms</h2>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{terms.additionalTerms}</p>
          </section>
        )}
      </div>

      <div className="mt-8 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Signatures</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {found.signatures.map((s) => (
            <li key={s.id} className="flex justify-between gap-4">
              <span>
                {s.fullName} <span className="text-muted-foreground">({s.role})</span>
              </span>
              <span className={s.signedAt ? "text-emerald-600" : "text-muted-foreground"}>
                {s.signedAt ? `Signed ${new Date(s.signedAt).toLocaleDateString("en-GB")}` : "Waiting"}
              </span>
            </li>
          ))}
        </ul>
        {me.signedAt ? (
          <p className="mt-4 text-sm">You signed this on {new Date(me.signedAt).toLocaleString("en-GB")}. Thank you.</p>
        ) : (
          <SignAgreementForm token={token} fullName={me.fullName} role={me.role} />
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Document fingerprint {found.agreement.termsHash.slice(0, 16)}…. Your name, the time and your IP address are
        recorded with your signature.
      </p>
    </main>
  );
}
