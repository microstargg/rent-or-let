import { createHash, randomBytes } from "crypto";
import { buildStyledPdf, paragraphBlocks, rowBlocks, type PdfBlock } from "@/lib/pdf/simple-pdf";

/**
 * A written statement of terms for an assured periodic tenancy, frozen when it is
 * sent for signing. Signers see exactly this snapshot, and its hash is recorded
 * with every signature so the signed version can be proved later.
 */
export interface AgreementTerms {
  version: 1;
  agency: { name: string; address: string | null; email: string; phone: string | null };
  landlord: { name: string; prsNumber: string | null };
  property: { address: string; furnished: string | null };
  tenants: string[];
  guarantors: { name: string; guarantees: string | null }[];
  startDate: string;
  rent: { amount: number; frequency: string; dueDay: number };
  payment: { accountName: string | null; sortCode: string | null; accountNumber: string | null; reference: string | null };
  deposit: { amount: number | null; scheme: string | null };
  additionalTerms: string | null;
  createdAt: string;
}

export const STANDARD_CLAUSES: { heading: string; text: string }[] = [
  {
    heading: "Type of tenancy",
    text: "This is an assured periodic tenancy under the Housing Act 1988. It runs from month to month (or the rent period shown) with no fixed end date. The tenant can end it by giving at least two months' written notice. The landlord can only end it on a ground set out in Schedule 2 to the Housing Act 1988, using the correct notice.",
  },
  {
    heading: "Rent",
    text: "The tenant pays the rent shown, in advance, on the due day each period. Rent can only be increased once a year using a Section 13 notice, and the tenant can challenge the increase at the First-tier Tribunal. Where there is more than one tenant, each is responsible for the whole rent.",
  },
  {
    heading: "Deposit",
    text: "Any deposit is protected in a government-approved scheme within 30 days of receipt, and the prescribed information is given to the tenant. It is returned at the end of the tenancy less any agreed or adjudicated deductions.",
  },
  {
    heading: "Repairs and access",
    text: "The landlord keeps the structure, exterior and installations for water, gas, electricity, heating and sanitation in repair. The tenant reports repairs promptly and allows access for inspections and works with at least 24 hours' written notice, except in an emergency.",
  },
  {
    heading: "Tenant obligations",
    text: "The tenant keeps the property clean and in reasonable condition, doesn't cause nuisance to neighbours, and doesn't sublet without consent. The tenant may ask to keep a pet; the landlord must reply in writing within 28 days and can't unreasonably refuse.",
  },
  {
    heading: "Guarantors",
    text: "Each guarantor named below promises to pay any rent or other sums the tenant they guarantee fails to pay under this tenancy, and to compensate the landlord for any breach by that tenant.",
  },
  {
    heading: "Permitted payments",
    text: "The landlord and agent will only ask for payments allowed by the Tenant Fees Act 2019: rent, a capped tenancy deposit, a capped holding deposit, interest on rent more than 14 days late (no more than 3% above Bank of England base rate), replacement keys at reasonable cost, and utilities, council tax and communication services where the tenant is liable.",
  },
];

export function hashTerms(terms: AgreementTerms): string {
  return createHash("sha256").update(JSON.stringify(terms)).digest("hex");
}

export function newSigningToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashSigningToken(token) };
}

export function hashSigningToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function money(n: number) {
  return `£${n.toFixed(2)}`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function ukDate(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

export interface AgreementSignatureLine {
  role: string;
  fullName: string;
  signedName: string | null;
  signedAt: Date | string | null;
  signedIp: string | null;
}

export function renderAgreementPdf(
  terms: AgreementTerms,
  opts: { hash: string; signatures?: AgreementSignatureLine[] } = { hash: "" }
): Uint8Array {
  const blocks: PdfBlock[] = [
    { kind: "title", text: "Tenancy agreement" },
    { kind: "text", text: "Written statement of terms: assured periodic tenancy", bold: true },
    { kind: "rule" },
    ...rowBlocks("Property", terms.property.address),
    ...rowBlocks("Landlord", terms.landlord.name),
  ];
  if (terms.landlord.prsNumber) {
    blocks.push(...rowBlocks("PRS Database no.", terms.landlord.prsNumber));
  }
  blocks.push(
    ...rowBlocks("Agent", [terms.agency.name, terms.agency.address].filter(Boolean).join(", ")),
    ...rowBlocks("Notices to", terms.agency.email),
    ...rowBlocks("Tenants", terms.tenants.join(", ")),
  );
  for (const g of terms.guarantors) {
    blocks.push(...rowBlocks("Guarantor", g.guarantees ? `${g.name} (for ${g.guarantees})` : g.name));
  }
  blocks.push(
    ...rowBlocks("Start date", ukDate(terms.startDate)),
    ...rowBlocks(
      "Rent",
      `${money(terms.rent.amount)} ${terms.rent.frequency === "weekly" ? "per week" : "per month"}, due on the ${ordinal(terms.rent.dueDay)}`
    )
  );
  if (terms.payment.accountNumber) {
    blocks.push(...rowBlocks("Pay to", [
        terms.payment.accountName,
        terms.payment.sortCode && `sort code ${terms.payment.sortCode}`,
        `account ${terms.payment.accountNumber}`,
        terms.payment.reference && `reference ${terms.payment.reference}`,
      ]
        .filter(Boolean)
        .join(", ")));
  }
  if (terms.deposit.amount) {
    blocks.push(...rowBlocks("Deposit", `${money(terms.deposit.amount)}${terms.deposit.scheme ? `, protected with ${terms.deposit.scheme}` : ""}`));
  }
  if (terms.property.furnished) {
    blocks.push(...rowBlocks("Furnishing", terms.property.furnished));
  }
  for (const clause of STANDARD_CLAUSES) {
    if (clause.heading === "Guarantors" && !terms.guarantors.length) continue;
    blocks.push({ kind: "heading", text: clause.heading }, ...paragraphBlocks(clause.text));
  }
  if (terms.additionalTerms?.trim()) {
    blocks.push({ kind: "heading", text: "Additional terms" });
    for (const para of terms.additionalTerms.split(/\n{2,}/)) {
      if (para.trim()) blocks.push(...paragraphBlocks(para.trim()));
    }
  }
  blocks.push({ kind: "heading", text: "Signatures" });
  const sigs = opts.signatures ?? [];
  if (!sigs.length) blocks.push({ kind: "text", text: "Not yet signed." });
  for (const s of sigs) {
    blocks.push(
      ...rowBlocks(
        `${s.role[0]!.toUpperCase()}${s.role.slice(1)}`,
        s.signedAt
          ? `${s.fullName}: signed as "${s.signedName}" on ${new Date(s.signedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}${s.signedIp ? ` from ${s.signedIp}` : ""}`
          : `${s.fullName}: awaiting signature`
      )
    );
  }
  blocks.push(
    { kind: "spacer" },
    ...paragraphBlocks(
      `Signed electronically. Document fingerprint (SHA-256): ${opts.hash}. Generated ${ukDate(terms.createdAt)}.`
    )
  );
  return buildStyledPdf(blocks);
}
