import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import {
  invoices,
  ledgerEntries,
  landlordInvites,
  landlordProfiles,
  landlordLedgerEntries,
  landlordPayouts,
  landlordStatements,
  documents,
  properties,
  renters,
  tenancies,
  tenancyParties,
  tickets,
} from "../schema";
import { listArrears } from "./finance";

export type PortalStatus = "active" | "invited" | "none";

/** Landlord portal access: signed in at least once, invited (and not expired), or never invited. */
export async function landlordPortalStatuses(landlordIds: string[]): Promise<Map<string, PortalStatus>> {
  await ensureAgency();
  const map = new Map<string, PortalStatus>();
  if (!landlordIds.length) return map;
  const [profiles, invites] = await Promise.all([
    db
      .select({ landlordId: landlordProfiles.landlordId })
      .from(landlordProfiles)
      .where(and(inArray(landlordProfiles.landlordId, landlordIds), agencyEq(landlordProfiles.agencyId))),
    db
      .select({ landlordId: landlordInvites.landlordId, expiresAt: landlordInvites.expiresAt })
      .from(landlordInvites)
      .where(and(inArray(landlordInvites.landlordId, landlordIds), agencyEq(landlordInvites.agencyId))),
  ]);
  const now = Date.now();
  for (const id of landlordIds) map.set(id, "none");
  for (const i of invites) if (i.expiresAt.getTime() > now) map.set(i.landlordId, "invited");
  for (const p of profiles) map.set(p.landlordId, "active");
  return map;
}

/** Money owed to each landlord now (positive = we owe them), from the landlord ledger. */
export async function landlordBalancesById(landlordIds: string[]): Promise<Map<string, number>> {
  await ensureAgency();
  const map = new Map<string, number>();
  if (!landlordIds.length) return map;
  const rows = await db
    .select({
      landlordId: landlordLedgerEntries.landlordId,
      balance: sql<string>`coalesce(sum(${landlordLedgerEntries.amount}), 0)`,
    })
    .from(landlordLedgerEntries)
    .where(
      and(inArray(landlordLedgerEntries.landlordId, landlordIds), agencyEq(landlordLedgerEntries.agencyId))
    )
    .groupBy(landlordLedgerEntries.landlordId);
  for (const r of rows) map.set(r.landlordId, Number(r.balance));
  return map;
}

/** Everything the landlord page shows, loaded in parallel. */
export async function getLandlordOverview(landlordId: string) {
  await ensureAgency();
  const [props, ledger, statements, payouts, portal, balance] = await Promise.all([
    db
      .select({
        property: properties,
        tenancyId: tenancies.id,
        tenancyStart: tenancies.startDate,
        tenancyRent: tenancies.rentAmount,
        renterFirstName: renters.firstName,
        renterLastName: renters.lastName,
      })
      .from(properties)
      .leftJoin(
        tenancies,
        and(eq(tenancies.propertyId, properties.id), eq(tenancies.status, "active"))
      )
      .leftJoin(renters, eq(renters.id, tenancies.primaryRenterId))
      .where(and(eq(properties.landlordId, landlordId), agencyEq(properties.agencyId)))
      .orderBy(properties.displayAddress),
    db
      .select()
      .from(landlordLedgerEntries)
      .where(and(eq(landlordLedgerEntries.landlordId, landlordId), agencyEq(landlordLedgerEntries.agencyId)))
      .orderBy(desc(landlordLedgerEntries.occurredAt))
      .limit(25),
    db
      .select({ statement: landlordStatements, document: documents })
      .from(landlordStatements)
      .leftJoin(documents, eq(landlordStatements.documentId, documents.id))
      .where(
        and(
          eq(landlordStatements.landlordId, landlordId),
          isNull(landlordStatements.propertyId),
          agencyEq(landlordStatements.agencyId)
        )
      )
      .orderBy(desc(landlordStatements.periodTo))
      .limit(24),
    db
      .select()
      .from(landlordPayouts)
      .where(and(eq(landlordPayouts.landlordId, landlordId), agencyEq(landlordPayouts.agencyId)))
      .orderBy(desc(landlordPayouts.paidAt))
      .limit(12),
    landlordPortalStatuses([landlordId]),
    landlordBalancesById([landlordId]),
  ]);

  const propertyIds = props.map((p) => p.property.id);
  const openRepairs = propertyIds.length
    ? await db
        .select({ id: tickets.id, propertyId: tickets.propertyId })
        .from(tickets)
        .where(
          and(
            inArray(tickets.propertyId, propertyIds),
            agencyEq(tickets.agencyId),
            inArray(tickets.status, ["new", "triaged", "scheduled"])
          )
        )
    : [];
  const repairsByProperty = new Map<string, number>();
  for (const t of openRepairs) {
    if (t.propertyId) repairsByProperty.set(t.propertyId, (repairsByProperty.get(t.propertyId) ?? 0) + 1);
  }

  return {
    properties: props.map((p) => ({
      ...p,
      openRepairs: repairsByProperty.get(p.property.id) ?? 0,
    })),
    ledger,
    statements,
    payouts,
    portal: portal.get(landlordId) ?? ("none" as PortalStatus),
    balance: balance.get(landlordId) ?? 0,
  };
}

export type RenterTenancySummary = {
  tenancyId: string;
  propertyId: string;
  propertyAddress: string;
  status: string;
  startDate: string;
  endDate: string | null;
  rentAmount: number;
  rentFrequency: string;
  arrears: number;
};

/**
 * Each renter's current tenancy (active first, then upcoming), as lead or joint tenant,
 * with the amount overdue on it.
 */
export async function currentTenancyByRenter(
  renterIds: string[],
  branchId?: string | null
): Promise<Map<string, RenterTenancySummary>> {
  await ensureAgency();
  const map = new Map<string, RenterTenancySummary>();
  if (!renterIds.length) return map;
  const [leadRows, jointRows, arrears] = await Promise.all([
    db
      .select({
        renterId: tenancies.primaryRenterId,
        tenancy: tenancies,
        propertyAddress: properties.displayAddress,
      })
      .from(tenancies)
      .innerJoin(properties, eq(properties.id, tenancies.propertyId))
      .where(
        and(
          inArray(tenancies.primaryRenterId, renterIds),
          agencyEq(tenancies.agencyId),
          or(eq(tenancies.status, "active"), eq(tenancies.status, "upcoming"), eq(tenancies.status, "pending"))
        )
      ),
    db
      .select({
        renterId: tenancyParties.renterId,
        tenancy: tenancies,
        propertyAddress: properties.displayAddress,
      })
      .from(tenancyParties)
      .innerJoin(tenancies, eq(tenancies.id, tenancyParties.tenancyId))
      .innerJoin(properties, eq(properties.id, tenancies.propertyId))
      .where(
        and(
          inArray(tenancyParties.renterId, renterIds),
          eq(tenancyParties.role, "tenant"),
          agencyEq(tenancies.agencyId),
          or(eq(tenancies.status, "active"), eq(tenancies.status, "upcoming"), eq(tenancies.status, "pending"))
        )
      ),
    branchId ? listArrears(branchId) : Promise.resolve([]),
  ]);
  const arrearsByTenancy = new Map(arrears.map((a) => [a.tenancyId, a.balance]));
  const rank = (s: string) => (s === "active" ? 0 : 1);
  for (const row of [...leadRows, ...jointRows]) {
    if (!row.renterId) continue;
    const existing = map.get(row.renterId);
    if (existing && rank(existing.status) <= rank(row.tenancy.status)) continue;
    map.set(row.renterId, {
      tenancyId: row.tenancy.id,
      propertyId: row.tenancy.propertyId,
      propertyAddress: row.propertyAddress,
      status: row.tenancy.status,
      startDate: row.tenancy.startDate,
      endDate: row.tenancy.endDate,
      rentAmount: Number(row.tenancy.rentAmount),
      rentFrequency: row.tenancy.rentFrequency,
      arrears: arrearsByTenancy.get(row.tenancy.id) ?? 0,
    });
  }
  return map;
}

export type TenancyLedgerLine = {
  id: string;
  date: Date;
  dueDate: string | null;
  kind: string;
  description: string;
  charge: number;
  paid: number;
  balance: number;
};

const LEDGER_LABEL: Record<string, string> = {
  charge: "Rent",
  late_fee: "Late payment interest",
  payment: "Payment received",
  refund: "Refund to tenant",
  adjustment: "Adjustment",
};

/**
 * The tenant's rent account: every charge and payment, oldest first, with a running balance
 * (positive = the tenant owes). Lines with no money (allocations, notes) are left out.
 */
export async function getTenancyLedger(tenancyId: string): Promise<TenancyLedgerLine[]> {
  await ensureAgency();
  const rows = await db
    .select({
      entry: ledgerEntries,
      invoiceType: invoices.type,
      invoiceDue: invoices.dueDate,
    })
    .from(ledgerEntries)
    .leftJoin(invoices, eq(invoices.id, ledgerEntries.invoiceId))
    .where(and(eq(ledgerEntries.tenancyId, tenancyId), agencyEq(ledgerEntries.agencyId)))
    .orderBy(ledgerEntries.occurredAt, ledgerEntries.createdAt);
  let balance = 0;
  const lines: TenancyLedgerLine[] = [];
  for (const { entry, invoiceType, invoiceDue } of rows) {
    const amount = Number(entry.amount);
    if (Math.abs(amount) < 0.005) continue;
    balance = Math.round((balance + amount) * 100) / 100;
    const label =
      entry.entryType === "charge" && invoiceType && invoiceType !== "rent"
        ? invoiceType === "late_fee"
          ? LEDGER_LABEL.late_fee
          : invoiceType.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
        : LEDGER_LABEL[entry.entryType] ?? entry.entryType.replaceAll("_", " ");
    lines.push({
      id: entry.id,
      date: entry.occurredAt,
      dueDate: invoiceDue ?? null,
      kind: entry.entryType,
      description: entry.memo && entry.entryType !== "charge" ? entry.memo : label,
      charge: amount > 0 ? amount : 0,
      paid: amount < 0 ? -amount : 0,
      balance,
    });
  }
  return lines;
}

/** Open repairs and the latest payments across a renter's tenancies, for the renter profile. */
export async function getRenterActivitySummary(tenancyIds: string[]) {
  await ensureAgency();
  if (!tenancyIds.length) return { openRepairs: 0, payments: [] as Array<{ id: string; tenancyId: string; amount: number; paidAt: Date }> };
  const [openTickets, payments] = await Promise.all([
    db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          inArray(tickets.tenancyId, tenancyIds),
          agencyEq(tickets.agencyId),
          inArray(tickets.status, ["new", "triaged", "scheduled"])
        )
      ),
    db
      .select({
        id: ledgerEntries.id,
        tenancyId: ledgerEntries.tenancyId,
        amount: ledgerEntries.amount,
        paidAt: ledgerEntries.occurredAt,
      })
      .from(ledgerEntries)
      .where(
        and(
          inArray(ledgerEntries.tenancyId, tenancyIds),
          eq(ledgerEntries.entryType, "payment"),
          agencyEq(ledgerEntries.agencyId)
        )
      )
      .orderBy(desc(ledgerEntries.occurredAt))
      .limit(12),
  ]);
  return {
    openRepairs: openTickets.length,
    payments: payments.map((p) => ({ ...p, amount: -Number(p.amount) })),
  };
}

/** Renters who are lead or joint tenant on a current or upcoming tenancy, optionally ignoring one tenancy. */
export async function rentersOnLiveTenancies(exceptTenancyId?: string): Promise<Set<string>> {
  await ensureAgency();
  const live = or(eq(tenancies.status, "active"), eq(tenancies.status, "upcoming"), eq(tenancies.status, "pending"));
  const [lead, joint] = await Promise.all([
    db
      .select({ renterId: tenancies.primaryRenterId, tenancyId: tenancies.id })
      .from(tenancies)
      .where(and(agencyEq(tenancies.agencyId), live)),
    db
      .select({ renterId: tenancyParties.renterId, tenancyId: tenancies.id })
      .from(tenancyParties)
      .innerJoin(tenancies, eq(tenancies.id, tenancyParties.tenancyId))
      .where(and(agencyEq(tenancies.agencyId), eq(tenancyParties.role, "tenant"), live)),
  ]);
  const set = new Set<string>();
  for (const r of [...lead, ...joint]) if (r.renterId && r.tenancyId !== exceptTenancyId) set.add(r.renterId);
  return set;
}
