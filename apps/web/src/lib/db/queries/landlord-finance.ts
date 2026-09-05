import { eq, and, desc, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId } from "../agency-scope";
import {
  landlordLedgerEntries,
  landlordStatements,
  landlordPayouts,
  landlords,
  branches,
  documents,
  invoices,
  properties,
} from "../schema";
import { getManagementFeePercent, parseBranchSettings } from "@/lib/branch-settings";
import { createDocument } from "./compliance";
import {
  parseStatementUploadFilename,
  statementDownloadPath,
  type LandlordStatementTotals,
  type LandlordStatementWorkLine,
} from "@/lib/pdf/landlord-statement";
import { WORKS_INVOICE_BILLED } from "@/lib/operations/maintenance/constants";
import { ensureJobInvoiceSchema } from "@/lib/db/ensure-schema";
import { groupLandlordStatementTotals } from "@/lib/operations/finance/statement-totals";

export async function insertLandlordLedgerEntry(data: {
  branchId: string;
  landlordId: string;
  propertyId?: string | null;
  tenancyId?: string | null;
  entryType: string;
  amount: number;
  paymentId?: string | null;
  workOrderId?: string | null;
  invoiceId?: string | null;
  statementId?: string | null;
  memo?: string | null;
  meta?: Record<string, unknown>;
  occurredAt?: Date;
}) {
  await ensureJobInvoiceSchema();
  const [row] = await db
    .insert(landlordLedgerEntries)
    .values({
      agencyId: currentAgencyId(),
      branchId: data.branchId,
      landlordId: data.landlordId,
      propertyId: data.propertyId ?? null,
      tenancyId: data.tenancyId ?? null,
      entryType: data.entryType,
      amount: String(data.amount),
      paymentId: data.paymentId ?? null,
      workOrderId: data.workOrderId ?? null,
      invoiceId: data.invoiceId ?? null,
      statementId: data.statementId ?? null,
      memo: data.memo ?? null,
      meta: data.meta ?? {},
      occurredAt: data.occurredAt ?? new Date(),
    })
    .returning();
  return row;
}

export async function getLandlordBalance(landlordId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${landlordLedgerEntries.amount}), 0)` })
    .from(landlordLedgerEntries)
    .where(
      and(
        eq(landlordLedgerEntries.landlordId, landlordId),
        agencyEq(landlordLedgerEntries.agencyId)
      )
    );
  return Number(row?.total ?? 0);
}

export async function postRentReceivedToLandlord(data: {
  branchId: string;
  landlordId: string;
  propertyId?: string | null;
  tenancyId?: string | null;
  rentAmount: number;
  paymentId?: string | null;
}) {
  const [branch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, data.branchId), agencyEq(branches.agencyId)))
    .limit(1);
  const feePercent = getManagementFeePercent(parseBranchSettings(branch?.settings));
  const fee = Math.round(data.rentAmount * (feePercent / 100) * 100) / 100;

  await insertLandlordLedgerEntry({
    branchId: data.branchId,
    landlordId: data.landlordId,
    propertyId: data.propertyId,
    tenancyId: data.tenancyId,
    entryType: "rent_received",
    amount: data.rentAmount,
    paymentId: data.paymentId,
    memo: "Rent received",
  });

  if (fee > 0) {
    await insertLandlordLedgerEntry({
      branchId: data.branchId,
      landlordId: data.landlordId,
      propertyId: data.propertyId,
      tenancyId: data.tenancyId,
      entryType: "management_fee",
      amount: -fee,
      paymentId: data.paymentId,
      memo: `Management fee ${feePercent}%`,
      meta: { fee_percent: feePercent },
    });
  }

  return { rent: data.rentAmount, fee };
}

export async function postLandlordAdjustment(data: {
  branchId: string;
  landlordId: string;
  amount: number;
  memo?: string;
  propertyId?: string | null;
}) {
  return insertLandlordLedgerEntry({
    branchId: data.branchId,
    landlordId: data.landlordId,
    propertyId: data.propertyId,
    entryType: "adjustment",
    amount: data.amount,
    memo: data.memo ?? "Adjustment",
  });
}

export async function postWorkOrderCostToLandlord(data: {
  branchId: string;
  landlordId: string;
  propertyId?: string | null;
  tenancyId?: string | null;
  workOrderId: string;
  invoiceId?: string | null;
  amount: number;
  memo?: string;
  occurredAt?: Date;
}) {
  return insertLandlordLedgerEntry({
    branchId: data.branchId,
    landlordId: data.landlordId,
    propertyId: data.propertyId,
    tenancyId: data.tenancyId,
    entryType: "work_order_cost",
    amount: -Math.abs(data.amount),
    workOrderId: data.workOrderId,
    invoiceId: data.invoiceId ?? null,
    memo: data.memo ?? "Maintenance cost",
    occurredAt: data.occurredAt,
  });
}

export async function listLandlordLedger(landlordId: string) {
  return db
    .select()
    .from(landlordLedgerEntries)
    .where(
      and(
        eq(landlordLedgerEntries.landlordId, landlordId),
        agencyEq(landlordLedgerEntries.agencyId)
      )
    )
    .orderBy(desc(landlordLedgerEntries.occurredAt));
}

export async function listLandlordBalances(branchId: string) {
  const rows = await db
    .select({
      landlordId: landlords.id,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
      balance: sql<string>`coalesce(sum(${landlordLedgerEntries.amount}), 0)`,
    })
    .from(landlords)
    .leftJoin(landlordLedgerEntries, eq(landlordLedgerEntries.landlordId, landlords.id))
    .where(and(eq(landlords.branchId, branchId), agencyEq(landlords.agencyId)))
    .groupBy(landlords.id, landlords.firstName, landlords.lastName);

  return rows
    .map((r) => ({
      landlordId: r.landlordId,
      name: `${r.firstName} ${r.lastName}`.trim(),
      balance: Number(r.balance),
    }))
    .sort((a, b) => b.balance - a.balance);
}

type LedgerRow = typeof landlordLedgerEntries.$inferSelect;

async function propertyAddressMap(propertyIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(propertyIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const rows = await db
    .select({ id: properties.id, displayAddress: properties.displayAddress })
    .from(properties)
    .where(and(inArray(properties.id, unique), agencyEq(properties.agencyId)));
  for (const row of rows) map.set(row.id, row.displayAddress);
  return map;
}

async function resolveWorksLine(
  work: LedgerRow,
  addressById: Map<string, string>
): Promise<{ line: LandlordStatementWorkLine; invoiceId: string | null }> {
  let inv =
    work.invoiceId != null
      ? (
          await db
            .select()
            .from(invoices)
            .where(and(eq(invoices.id, work.invoiceId), agencyEq(invoices.agencyId)))
            .limit(1)
        )[0]
      : null;
  if (!inv && work.workOrderId) {
    const [byJob] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.workOrderId, work.workOrderId), agencyEq(invoices.agencyId)))
      .limit(1);
    inv = byJob ?? null;
  }

  const meta =
    inv && typeof inv.meta === "object" && inv.meta
      ? (inv.meta as Record<string, unknown>)
      : {};
  const dated = inv?.dueDate ?? work.occurredAt.toISOString().slice(0, 10);
  const summary =
    (typeof meta.ticket_summary === "string" && meta.ticket_summary) ||
    work.memo ||
    "Maintenance";
  const address =
    (typeof meta.property_address === "string" && meta.property_address) ||
    (work.propertyId ? addressById.get(work.propertyId) : "") ||
    "";
  return {
    invoiceId: inv?.id ?? null,
    line: {
      dated,
      address,
      summary,
      amount: Math.abs(Number(work.amount)),
    },
  };
}

export async function buildStatementTotalsFromLedger(
  entries: LedgerRow[]
): Promise<{ totals: LandlordStatementTotals; billedInvoiceIds: string[] }> {
  const addressById = await propertyAddressMap(
    entries.map((e) => e.propertyId).filter((id): id is string => Boolean(id))
  );
  const billedInvoiceIds: string[] = [];
  const prepared = [];

  for (const e of entries) {
    if (e.entryType === "work_order_cost") {
      const resolved = await resolveWorksLine(e, addressById);
      if (resolved.invoiceId) billedInvoiceIds.push(resolved.invoiceId);
      prepared.push({
        propertyId: e.propertyId,
        entryType: e.entryType,
        amount: Number(e.amount),
        work: resolved.line,
      });
    } else {
      prepared.push({
        propertyId: e.propertyId,
        entryType: e.entryType,
        amount: Number(e.amount),
      });
    }
  }

  return {
    totals: groupLandlordStatementTotals({ entries: prepared, propertyAddressById: addressById }),
    billedInvoiceIds: [...new Set(billedInvoiceIds)],
  };
}

async function ledgerEntriesForPeriod(opts: {
  branchId: string;
  from: string;
  to: string;
  landlordId?: string;
}) {
  const fromIso = `${opts.from}T00:00:00.000Z`;
  const toIso = `${opts.to}T23:59:59.999Z`;
  const filters = [
    eq(landlordLedgerEntries.branchId, opts.branchId),
    agencyEq(landlordLedgerEntries.agencyId),
    gte(landlordLedgerEntries.occurredAt, new Date(fromIso)),
    lte(landlordLedgerEntries.occurredAt, new Date(toIso)),
  ];
  if (opts.landlordId) filters.push(eq(landlordLedgerEntries.landlordId, opts.landlordId));
  return db
    .select()
    .from(landlordLedgerEntries)
    .where(and(...filters));
}

export async function statementTotalsForDownload(statement: {
  branchId: string;
  landlordId: string;
  periodFrom: string;
  periodTo: string;
  totals: unknown;
}): Promise<LandlordStatementTotals> {
  const stored = (statement.totals ?? {}) as LandlordStatementTotals;
  if (Array.isArray(stored.properties) && stored.properties.length > 0) return stored;

  const entries = await ledgerEntriesForPeriod({
    branchId: statement.branchId,
    from: statement.periodFrom,
    to: statement.periodTo,
    landlordId: statement.landlordId,
  });
  if (entries.length === 0) return stored;
  const { totals } = await buildStatementTotalsFromLedger(entries);
  return {
    ...stored,
    ...totals,
    works: totals.works?.length ? totals.works : stored.works,
  };
}

export async function generateLandlordStatements(
  branchId: string,
  from: string,
  to: string
) {
  const { chargeUnbilledWorkInvoicesForPeriod } = await import(
    "@/lib/operations/maintenance/work-order-invoice"
  );
  await chargeUnbilledWorkInvoicesForPeriod(branchId, to);

  const entries = await ledgerEntriesForPeriod({ branchId, from, to });
  const byLandlord = new Map<string, LedgerRow[]>();
  for (const e of entries) {
    const list = byLandlord.get(e.landlordId) ?? [];
    list.push(e);
    byLandlord.set(e.landlordId, list);
  }

  const created = [];
  for (const [landlordId, landlordEntries] of byLandlord) {
    const [ll] = await db
      .select()
      .from(landlords)
      .where(and(eq(landlords.id, landlordId), agencyEq(landlords.agencyId)))
      .limit(1);
    const { totals, billedInvoiceIds } = await buildStatementTotalsFromLedger(landlordEntries);
    const billed = new Set(billedInvoiceIds);

    const [stmt] = await db
      .insert(landlordStatements)
      .values({
        agencyId: currentAgencyId(),
        branchId,
        landlordId,
        periodFrom: from,
        periodTo: to,
        totals,
        status: "issued",
        issuedAt: new Date(),
      })
      .returning();

    const filename = `statement-${from}-${to}.pdf`;
    const url = statementDownloadPath(stmt.id);
    const doc = await createDocument({
      branchId,
      entityType: "landlord",
      entityId: landlordId,
      kind: "statement",
      url,
      filename,
    });

    const [updated] = await db
      .update(landlordStatements)
      .set({ documentId: doc.id })
      .where(and(eq(landlordStatements.id, stmt.id), agencyEq(landlordStatements.agencyId)))
      .returning();

    for (const entry of landlordEntries) {
      if (entry.entryType !== "work_order_cost") continue;
      await db
        .update(landlordLedgerEntries)
        .set({ statementId: stmt.id })
        .where(
          and(eq(landlordLedgerEntries.id, entry.id), agencyEq(landlordLedgerEntries.agencyId))
        );
    }

    for (const invoiceId of billed) {
      const [existing] = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), agencyEq(invoices.agencyId)))
        .limit(1);
      if (!existing) continue;
      const meta =
        typeof existing.meta === "object" && existing.meta
          ? (existing.meta as Record<string, unknown>)
          : {};
      await db
        .update(invoices)
        .set({
          status: WORKS_INVOICE_BILLED,
          meta: { ...meta, statement_id: stmt.id },
        })
        .where(and(eq(invoices.id, invoiceId), agencyEq(invoices.agencyId)));
    }

    created.push({
      statement: updated ?? stmt,
      document: doc,
      name: ll ? `${ll.firstName} ${ll.lastName}` : "",
    });
  }

  return created;
}

export async function listLandlordStatements(branchId: string) {
  return db
    .select({
      statement: landlordStatements,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
      document: documents,
    })
    .from(landlordStatements)
    .innerJoin(landlords, eq(landlordStatements.landlordId, landlords.id))
    .leftJoin(documents, eq(landlordStatements.documentId, documents.id))
    .where(
      and(eq(landlordStatements.branchId, branchId), agencyEq(landlordStatements.agencyId))
    )
    .orderBy(desc(landlordStatements.createdAt));
}

export async function createLandlordPayout(data: {
  branchId: string;
  landlordId: string;
  amount?: number;
  method?: string;
}) {
  const balance = await getLandlordBalance(data.landlordId);
  const amount = data.amount ?? balance;
  if (amount <= 0) return null;

  const [payout] = await db
    .insert(landlordPayouts)
    .values({
      agencyId: currentAgencyId(),
      branchId: data.branchId,
      landlordId: data.landlordId,
      amount: String(amount),
      method: data.method ?? "bank_transfer",
    })
    .returning();

  await insertLandlordLedgerEntry({
    branchId: data.branchId,
    landlordId: data.landlordId,
    entryType: "payout",
    amount: -amount,
    memo: "Landlord payout",
    meta: { payout_id: payout.id },
  });

  return payout;
}

export async function getLandlordStatementForDownload(id: string) {
  const [row] = await db
    .select({
      statement: landlordStatements,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
    })
    .from(landlordStatements)
    .innerJoin(landlords, eq(landlordStatements.landlordId, landlords.id))
    .where(and(eq(landlordStatements.id, id), agencyEq(landlordStatements.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function getLandlordStatementForView(id: string) {
  const row = await getLandlordStatementForDownload(id);
  if (!row) return null;
  const totals = await statementTotalsForDownload(row.statement);
  return {
    statement: row.statement,
    firstName: row.firstName,
    lastName: row.lastName,
    landlordName: `${row.firstName} ${row.lastName}`.trim() || "Landlord",
    totals,
  };
}

export async function findLandlordStatementByUpload(landlordId: string, filename: string) {
  const parsed = parseStatementUploadFilename(filename);
  if (!parsed) return null;

  const [row] = await db
    .select({
      statement: landlordStatements,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
    })
    .from(landlordStatements)
    .innerJoin(landlords, eq(landlordStatements.landlordId, landlords.id))
    .where(
      and(
        eq(landlordStatements.landlordId, landlordId),
        eq(landlordStatements.periodFrom, parsed.from),
        eq(landlordStatements.periodTo, parsed.to),
        agencyEq(landlordStatements.agencyId)
      )
    )
    .orderBy(desc(landlordStatements.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listLandlordPayouts(branchId: string) {
  return db
    .select({
      payout: landlordPayouts,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
    })
    .from(landlordPayouts)
    .innerJoin(landlords, eq(landlordPayouts.landlordId, landlords.id))
    .where(and(eq(landlordPayouts.branchId, branchId), agencyEq(landlordPayouts.agencyId)))
    .orderBy(desc(landlordPayouts.paidAt));
}
