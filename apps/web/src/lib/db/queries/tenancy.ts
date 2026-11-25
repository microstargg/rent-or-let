import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getTenant } from "@repo/config/server";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import {
  agreementSignatures,
  branches,
  invoices,
  landlords,
  ledgerEntries,
  notices,
  properties,
  renters,
  tenancies,
  tenancyAgreements,
  tenancyParties,
  documents,
  inspections,
} from "../schema";
import { createComplianceItem, createDocument } from "./compliance";
import { createTask } from "./finance";
import { parseBranchSettings, getClientAccountDetails } from "@/lib/branch-settings";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";
import { displayPersonName } from "@/lib/person-name";
import {
  hashSigningToken,
  hashTerms,
  newSigningToken,
  type AgreementTerms,
} from "@/lib/tenancy/agreement";
import { parsePaymentPlan } from "@/lib/finance/arrears";
import { parseInspectionReport } from "@/lib/inspections/report";
import { parseDepositReturn, splitDeposit, type DepositDeduction, type DepositReturn } from "@/lib/tenancy/deposits";

/** Rent and late fees that have fallen due and are unpaid (future charges ignored). */
export async function getOverdueBalance(tenancyId: string): Promise<number> {
  await ensureAgency();
  const today = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(case when ${ledgerEntries.entryType} in ('charge', 'late_fee') and ${invoices.dueDate} > ${today} then 0 else ${ledgerEntries.amount} end), 0)`,
    })
    .from(ledgerEntries)
    .leftJoin(invoices, eq(ledgerEntries.invoiceId, invoices.id))
    .where(and(eq(ledgerEntries.tenancyId, tenancyId), agencyEq(ledgerEntries.agencyId)));
  return Math.max(0, Number(row?.total ?? 0));
}

export async function getTenancyDetail(id: string) {
  await ensureAgency();
  const [row] = await db
    .select({ tenancy: tenancies, property: properties, renter: renters, landlord: landlords })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .leftJoin(landlords, eq(properties.landlordId, landlords.id))
    .where(and(eq(tenancies.id, id), agencyEq(tenancies.agencyId)))
    .limit(1);
  if (!row) return null;

  const [partyRows, agreementRows, noticeRows, overdue] = await Promise.all([
    db
      .select({ party: tenancyParties, renter: renters })
      .from(tenancyParties)
      .leftJoin(renters, eq(tenancyParties.renterId, renters.id))
      .where(and(eq(tenancyParties.tenancyId, id), agencyEq(tenancyParties.agencyId)))
      .orderBy(asc(tenancyParties.createdAt)),
    db
      .select()
      .from(tenancyAgreements)
      .where(and(eq(tenancyAgreements.tenancyId, id), agencyEq(tenancyAgreements.agencyId)))
      .orderBy(desc(tenancyAgreements.createdAt)),
    db
      .select({ notice: notices, documentUrl: documents.url })
      .from(notices)
      .leftJoin(documents, eq(notices.documentId, documents.id))
      .where(and(eq(notices.tenancyId, id), agencyEq(notices.agencyId)))
      .orderBy(desc(notices.createdAt)),
    getOverdueBalance(id),
  ]);

  const agreementIds = agreementRows.map((a) => a.id);
  const signatureRows = agreementIds.length
    ? await db
        .select()
        .from(agreementSignatures)
        .where(
          and(
            inArray(agreementSignatures.agreementId, agreementIds),
            agencyEq(agreementSignatures.agencyId)
          )
        )
        .orderBy(asc(agreementSignatures.createdAt))
    : [];

  return {
    ...row,
    jointTenants: partyRows.filter((p) => p.party.role === "tenant" && p.renter).map((p) => ({
      partyId: p.party.id,
      renter: p.renter!,
    })),
    guarantors: partyRows.filter((p) => p.party.role === "guarantor").map((p) => p.party),
    agreements: agreementRows.map((a) => ({
      agreement: a,
      signatures: signatureRows.filter((s) => s.agreementId === a.id),
    })),
    notices: noticeRows,
    overdue,
    depositReturn: parseDepositReturn(row.tenancy.depositReturn),
    paymentPlan: parsePaymentPlan(row.tenancy.paymentPlan),
  };
}

export type TenancyDetail = NonNullable<Awaited<ReturnType<typeof getTenancyDetail>>>;

/** Every tenancy a renter is on, as lead or joint tenant. */
export async function listTenancyIdsForRenter(renterId: string): Promise<string[]> {
  await ensureAgency();
  const joint = await db
    .select({ tenancyId: tenancyParties.tenancyId })
    .from(tenancyParties)
    .where(
      and(
        eq(tenancyParties.renterId, renterId),
        eq(tenancyParties.role, "tenant"),
        agencyEq(tenancyParties.agencyId)
      )
    );
  return joint.map((j) => j.tenancyId);
}

async function requireTenancy(tenancyId: string) {
  const [t] = await db
    .select()
    .from(tenancies)
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)))
    .limit(1);
  return t ?? null;
}

export async function addJointTenant(tenancyId: string, renterId: string) {
  await ensureAgency();
  const t = await requireTenancy(tenancyId);
  if (!t) return { error: "Tenancy not found" as const };
  if (t.primaryRenterId === renterId) return { error: "That renter is already the lead tenant" as const };
  const [renter] = await db
    .select({ id: renters.id })
    .from(renters)
    .where(and(eq(renters.id, renterId), agencyEq(renters.agencyId)))
    .limit(1);
  if (!renter) return { error: "Renter not found" as const };
  const [row] = await db
    .insert(tenancyParties)
    .values({
      agencyId: currentAgencyId(),
      branchId: t.branchId,
      tenancyId,
      role: "tenant",
      renterId,
    })
    .onConflictDoNothing()
    .returning();
  return { row: row ?? null };
}

export async function addGuarantor(
  tenancyId: string,
  data: { fullName: string; email?: string | null; phone?: string | null; address?: string | null; guaranteesRenterId?: string | null }
) {
  await ensureAgency();
  const t = await requireTenancy(tenancyId);
  if (!t) return null;
  const [row] = await db
    .insert(tenancyParties)
    .values({
      agencyId: currentAgencyId(),
      branchId: t.branchId,
      tenancyId,
      role: "guarantor",
      fullName: data.fullName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      guaranteesRenterId: data.guaranteesRenterId ?? null,
    })
    .returning();
  return row;
}

export async function removeTenancyParty(tenancyId: string, partyId: string) {
  await ensureAgency();
  const [row] = await db
    .delete(tenancyParties)
    .where(
      and(
        eq(tenancyParties.id, partyId),
        eq(tenancyParties.tenancyId, tenancyId),
        agencyEq(tenancyParties.agencyId)
      )
    )
    .returning();
  return row ?? null;
}

/**
 * Record a Right to Rent check. Time-limited permission gets a compliance item
 * that expires on the follow-up date, so the existing certificate reminders chase it.
 */
export async function recordRightToRent(
  tenancyId: string,
  renterId: string,
  data: { checkedAt: string; method: string; expiresAt?: string | null }
) {
  await ensureAgency();
  const t = await requireTenancy(tenancyId);
  if (!t) return null;
  const [updated] = await db
    .update(renters)
    .set({ rtrCheckedAt: data.checkedAt, rtrMethod: data.method, rtrExpiresAt: data.expiresAt ?? null })
    .where(and(eq(renters.id, renterId), agencyEq(renters.agencyId)))
    .returning();
  if (!updated) return null;
  await createComplianceItem({
    branchId: t.branchId,
    propertyId: t.propertyId,
    tenancyId: t.id,
    type: "right_to_rent",
    issuedAt: data.checkedAt,
    expiresAt: data.expiresAt ?? null,
    reference: `${displayPersonName(updated.firstName, updated.lastName)} (${data.method})`,
    // Time-limited permission gets expiring/expired from the date, like a certificate.
    status: data.expiresAt ? undefined : "valid",
  });
  return updated;
}

export async function saveDepositReturn(
  tenancyId: string,
  input: {
    deductions?: DepositDeduction[];
    status?: DepositReturn["status"];
    notes?: string | null;
    dispute?: { schemeCaseRef?: string; outcome?: string; resolved?: boolean } | null;
  }
): Promise<{ error: string } | { depositReturn: DepositReturn }> {
  await ensureAgency();
  const t = await requireTenancy(tenancyId);
  if (!t) return { error: "Tenancy not found" };
  const deposit = Number(t.depositAmount ?? 0);
  const current = parseDepositReturn(t.depositReturn) ?? {
    deductions: [],
    toTenant: deposit,
    toLandlord: 0,
    status: "proposed" as const,
  };
  const today = new Date().toISOString().slice(0, 10);
  const next: DepositReturn = { ...current };

  if (input.deductions) {
    const split = splitDeposit(deposit, input.deductions);
    if (!split.ok) return { error: split.error };
    next.deductions = input.deductions.filter((d) => d.reason.trim() && d.amount > 0);
    next.toLandlord = split.toLandlord;
    next.toTenant = split.toTenant;
    next.proposedAt = today;
  }
  if (input.notes !== undefined) next.notes = input.notes ?? undefined;
  if (input.status) {
    next.status = input.status;
    if (input.status === "agreed") next.agreedAt = today;
    if (input.status === "paid") next.paidAt = today;
    if (input.status === "disputed" && !next.dispute) next.dispute = { openedAt: today };
  }
  if (input.dispute) {
    next.dispute = {
      openedAt: next.dispute?.openedAt ?? today,
      schemeCaseRef: input.dispute.schemeCaseRef ?? next.dispute?.schemeCaseRef,
      outcome: input.dispute.outcome ?? next.dispute?.outcome,
      resolvedAt: input.dispute.resolved ? today : next.dispute?.resolvedAt,
    };
  }

  await db
    .update(tenancies)
    .set({ depositReturn: next })
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)));

  if (input.status === "disputed") {
    await createTask({
      branchId: t.branchId,
      title: "Deposit dispute: send evidence to the scheme",
      relatedType: "tenancy",
      relatedId: t.id,
      dueAt: new Date(Date.now() + 10 * 86400000),
    });
  }
  return { depositReturn: next };
}

async function buildAgreementTerms(tenancyId: string, additionalTerms: string | null): Promise<AgreementTerms | null> {
  const detail = await getTenancyDetail(tenancyId);
  if (!detail) return null;
  const [branch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, detail.tenancy.branchId), agencyEq(branches.agencyId)))
    .limit(1);
  const settings = parseBranchSettings(branch?.settings);
  const account = getClientAccountDetails(settings);
  const tenant = getTenant();
  const addr = tenant.site.contact.address;
  const renterNames = new Map<string, string>([
    [detail.renter.id, displayPersonName(detail.renter.firstName, detail.renter.lastName)],
    ...detail.jointTenants.map(
      (j) => [j.renter.id, displayPersonName(j.renter.firstName, j.renter.lastName)] as [string, string]
    ),
  ]);
  return {
    version: 1,
    agency: {
      name: tenant.name,
      address: addr ? [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(", ") : null,
      email: tenant.site.contact.email,
      phone: tenant.site.contact.phone ?? null,
    },
    landlord: {
      name: detail.landlord
        ? displayPersonName(detail.landlord.firstName, detail.landlord.lastName)
        : "The landlord (care of the agent)",
      prsNumber: detail.landlord?.prsRegistrationNumber ?? null,
    },
    property: { address: detail.property.displayAddress, furnished: detail.property.furnished },
    tenants: [...renterNames.values()],
    guarantors: detail.guarantors.map((g) => ({
      name: g.fullName ?? "Guarantor",
      guarantees: g.guaranteesRenterId ? renterNames.get(g.guaranteesRenterId) ?? null : null,
    })),
    startDate: detail.tenancy.startDate,
    rent: {
      amount: Number(detail.tenancy.rentAmount),
      frequency: detail.tenancy.rentFrequency,
      dueDay: 1,
    },
    payment: {
      accountName: account.name,
      sortCode: account.sortCode,
      accountNumber: account.accountNumber,
      reference: getPaymentRefFromMetadata(detail.tenancy.metadata),
    },
    deposit: {
      amount: detail.tenancy.depositAmount ? Number(detail.tenancy.depositAmount) : null,
      scheme: detail.tenancy.depositScheme,
    },
    additionalTerms: additionalTerms?.trim() || null,
    createdAt: new Date().toISOString(),
  };
}

export interface SigningLink {
  role: string;
  fullName: string;
  email: string | null;
  token: string;
}

/**
 * Freeze the terms and create one signing link per tenant, guarantor and the agent.
 * Any earlier unsigned agreement for the tenancy is cancelled.
 */
export async function createTenancyAgreement(
  tenancyId: string,
  opts: { additionalTerms?: string | null; agentName: string; agentEmail: string | null }
): Promise<{ error: string } | { agreementId: string; links: SigningLink[] }> {
  await ensureAgency();
  const detail = await getTenancyDetail(tenancyId);
  if (!detail) return { error: "Tenancy not found" };
  const terms = await buildAgreementTerms(tenancyId, opts.additionalTerms ?? null);
  if (!terms) return { error: "Tenancy not found" };

  await db
    .update(tenancyAgreements)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(tenancyAgreements.tenancyId, tenancyId),
        eq(tenancyAgreements.status, "sent"),
        agencyEq(tenancyAgreements.agencyId)
      )
    );

  const hash = hashTerms(terms);
  const [agreement] = await db
    .insert(tenancyAgreements)
    .values({
      agencyId: currentAgencyId(),
      branchId: detail.tenancy.branchId,
      tenancyId,
      status: "sent",
      terms,
      termsHash: hash,
    })
    .returning();

  const people: { role: string; fullName: string; email: string | null }[] = [
    {
      role: "tenant",
      fullName: displayPersonName(detail.renter.firstName, detail.renter.lastName),
      email: detail.renter.email,
    },
    ...detail.jointTenants.map((j) => ({
      role: "tenant",
      fullName: displayPersonName(j.renter.firstName, j.renter.lastName),
      email: j.renter.email,
    })),
    ...detail.guarantors.map((g) => ({ role: "guarantor", fullName: g.fullName ?? "Guarantor", email: g.email })),
    { role: "agent", fullName: opts.agentName, email: opts.agentEmail },
  ];

  const links: SigningLink[] = [];
  for (const p of people) {
    const { token, hash: tokenHash } = newSigningToken();
    await db.insert(agreementSignatures).values({
      agencyId: currentAgencyId(),
      agreementId: agreement.id,
      role: p.role,
      fullName: p.fullName,
      email: p.email,
      tokenHash,
    });
    links.push({ ...p, token });
  }
  return { agreementId: agreement.id, links };
}

export async function getSignatureByToken(token: string) {
  await ensureAgency();
  const [row] = await db
    .select({ signature: agreementSignatures, agreement: tenancyAgreements })
    .from(agreementSignatures)
    .innerJoin(tenancyAgreements, eq(agreementSignatures.agreementId, tenancyAgreements.id))
    .where(
      and(eq(agreementSignatures.tokenHash, hashSigningToken(token)), agencyEq(agreementSignatures.agencyId))
    )
    .limit(1);
  if (!row) return null;
  const all = await db
    .select()
    .from(agreementSignatures)
    .where(and(eq(agreementSignatures.agreementId, row.agreement.id), agencyEq(agreementSignatures.agencyId)))
    .orderBy(asc(agreementSignatures.createdAt));
  return { ...row, signatures: all };
}

export async function signAgreement(
  token: string,
  data: { signedName: string; ip: string | null; userAgent: string | null }
): Promise<{ error: string } | { completed: boolean }> {
  const found = await getSignatureByToken(token);
  if (!found) return { error: "This signing link isn't valid." };
  if (found.agreement.status === "cancelled") return { error: "This agreement was replaced. Ask the agent for a new link." };
  if (found.signature.signedAt) return { error: "Already signed." };

  await db
    .update(agreementSignatures)
    .set({
      signedName: data.signedName,
      signedAt: new Date(),
      signedIp: data.ip,
      signedUserAgent: data.userAgent?.slice(0, 300) ?? null,
    })
    .where(and(eq(agreementSignatures.id, found.signature.id), isNull(agreementSignatures.signedAt)));

  const remaining = found.signatures.filter((s) => !s.signedAt && s.id !== found.signature.id).length;
  if (remaining > 0) return { completed: false };

  const doc = await createDocument({
    branchId: found.agreement.branchId,
    entityType: "tenancy",
    entityId: found.agreement.tenancyId,
    kind: "tenancy_agreement",
    url: `/api/agreements/${found.agreement.id}/pdf`,
    filename: "tenancy-agreement.pdf",
    meta: { termsHash: found.agreement.termsHash },
  });
  await db
    .update(tenancyAgreements)
    .set({ status: "signed", completedAt: new Date(), documentId: doc.id })
    .where(and(eq(tenancyAgreements.id, found.agreement.id), agencyEq(tenancyAgreements.agencyId)));
  return { completed: true };
}

export async function getAgreementWithSignatures(agreementId: string) {
  await ensureAgency();
  const [agreement] = await db
    .select()
    .from(tenancyAgreements)
    .where(and(eq(tenancyAgreements.id, agreementId), agencyEq(tenancyAgreements.agencyId)))
    .limit(1);
  if (!agreement) return null;
  const signatures = await db
    .select()
    .from(agreementSignatures)
    .where(and(eq(agreementSignatures.agreementId, agreementId), agencyEq(agreementSignatures.agencyId)))
    .orderBy(asc(agreementSignatures.createdAt));
  return { agreement, signatures };
}

/** Lead and joint tenants on a tenancy, for reminders and notices. */
export async function listTenancyContacts(tenancyId: string) {
  await ensureAgency();
  const [lead] = await db
    .select({ renter: renters, tenancy: tenancies })
    .from(tenancies)
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)))
    .limit(1);
  if (!lead) return { tenancy: null, contacts: [] };
  const joint = await db
    .select({ renter: renters })
    .from(tenancyParties)
    .innerJoin(renters, eq(tenancyParties.renterId, renters.id))
    .where(
      and(
        eq(tenancyParties.tenancyId, tenancyId),
        eq(tenancyParties.role, "tenant"),
        agencyEq(tenancyParties.agencyId)
      )
    );
  const contacts = [lead.renter, ...joint.map((j) => j.renter)].map((r) => ({
    renterId: r.id,
    name: r.firstName,
    fullName: displayPersonName(r.firstName, r.lastName),
    email: r.email,
    phone: r.phone,
  }));
  return { tenancy: lead.tenancy, contacts };
}

export async function setTenancyJson(
  tenancyId: string,
  field: "paymentPlan" | "arrearsReminders" | "utilityNotices",
  value: Record<string, unknown> | null
) {
  await ensureAgency();
  const [row] = await db
    .update(tenancies)
    .set({ [field]: value })
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)))
    .returning();
  return row ?? null;
}

/** Meter readings from the tenancy's latest check-in or check-out (completed ones first). */
export async function getInspectionMeters(tenancyId: string, type: "move_in" | "move_out") {
  await ensureAgency();
  const rows = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.tenancyId, tenancyId), eq(inspections.type, type), agencyEq(inspections.agencyId)))
    .orderBy(desc(inspections.createdAt))
    .limit(5);
  const row = rows.find((r) => r.completedAt) ?? rows[0];
  if (!row) return null;
  const report = parseInspectionReport(row.meta);
  return {
    inspectionId: row.id,
    date: (row.completedAt ?? row.scheduledAt)?.toISOString().slice(0, 10) ?? null,
    meters: report.meters.map((m) => ({ type: m.type, reading: m.reading ?? "" })),
  };
}
