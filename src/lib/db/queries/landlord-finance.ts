import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../index";
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
import { parseStatementUploadFilename, statementDownloadPath } from "@/lib/pdf/landlord-statement";
import { WORKS_INVOICE_BILLED } from "@/lib/operations/maintenance/constants";
import { ensureJobInvoiceSchema } from "@/lib/db/ensure-schema";

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
    .where(eq(landlordLedgerEntries.landlordId, landlordId));
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
  const [branch] = await db.select().from(branches).where(eq(branches.id, data.branchId)).limit(1);
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
    .where(eq(landlordLedgerEntries.landlordId, landlordId))
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
    .where(eq(landlords.branchId, branchId))
    .groupBy(landlords.id, landlords.firstName, landlords.lastName);

  return rows
    .map((r) => ({
      landlordId: r.landlordId,
      name: `${r.firstName} ${r.lastName}`.trim(),
      balance: Number(r.balance),
    }))
    .sort((a, b) => b.balance - a.balance);
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

  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const entries = await db
    .select()
    .from(landlordLedgerEntries)
    .where(
      and(
        eq(landlordLedgerEntries.branchId, branchId),
        gte(landlordLedgerEntries.occurredAt, new Date(fromIso)),
        lte(landlordLedgerEntries.occurredAt, new Date(toIso))
      )
    );

  const byLandlord = new Map<
    string,
    {
      rent: number;
      fees: number;
      costs: number;
      adjustments: number;
      net: number;
      count: number;
      works: typeof entries;
    }
  >();

  for (const e of entries) {
    const cur = byLandlord.get(e.landlordId) ?? {
      rent: 0,
      fees: 0,
      costs: 0,
      adjustments: 0,
      net: 0,
      count: 0,
      works: [],
    };
    const amt = Number(e.amount);
    cur.net += amt;
    cur.count += 1;
    if (e.entryType === "rent_received") cur.rent += amt;
    else if (e.entryType === "management_fee") cur.fees += amt;
    else if (e.entryType === "work_order_cost") {
      cur.costs += amt;
      cur.works.push(e);
    } else cur.adjustments += amt;
    byLandlord.set(e.landlordId, cur);
  }

  const created = [];
  for (const [landlordId, totals] of byLandlord) {
    const [ll] = await db.select().from(landlords).where(eq(landlords.id, landlordId)).limit(1);
    const billedInvoiceIds = new Set<string>();
    const works: Array<{
      dated: string;
      address: string;
      summary: string;
      amount: number;
    }> = [];

    for (const work of totals.works) {
      let inv =
        work.invoiceId != null
          ? (
              await db.select().from(invoices).where(eq(invoices.id, work.invoiceId)).limit(1)
            )[0]
          : null;
      if (!inv && work.workOrderId) {
        const [byJob] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.workOrderId, work.workOrderId))
          .limit(1);
        inv = byJob ?? null;
      }
      if (inv) billedInvoiceIds.add(inv.id);

      const meta =
        inv && typeof inv.meta === "object" && inv.meta
          ? (inv.meta as Record<string, unknown>)
          : {};
      const [prop] = work.propertyId
        ? await db.select().from(properties).where(eq(properties.id, work.propertyId)).limit(1)
        : [null];
      const dated = inv?.dueDate ?? work.occurredAt.toISOString().slice(0, 10);
      const summary =
        (typeof meta.ticket_summary === "string" && meta.ticket_summary) ||
        work.memo ||
        "Maintenance";
      const address =
        (typeof meta.property_address === "string" && meta.property_address) ||
        prop?.displayAddress ||
        "";
      works.push({
        dated,
        address,
        summary,
        amount: Math.abs(Number(work.amount)),
      });
    }

    const [stmt] = await db
      .insert(landlordStatements)
      .values({
        branchId,
        landlordId,
        periodFrom: from,
        periodTo: to,
        totals: {
          rent: totals.rent,
          fees: totals.fees,
          costs: totals.costs,
          adjustments: totals.adjustments,
          net: totals.net,
          count: totals.count,
          works,
        },
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
      .where(eq(landlordStatements.id, stmt.id))
      .returning();

    for (const work of totals.works) {
      await db
        .update(landlordLedgerEntries)
        .set({ statementId: stmt.id })
        .where(eq(landlordLedgerEntries.id, work.id));
    }

    for (const invoiceId of billedInvoiceIds) {
      const [existing] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
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
        .where(eq(invoices.id, invoiceId));
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
    .where(eq(landlordStatements.branchId, branchId))
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
    .where(eq(landlordStatements.id, id))
    .limit(1);
  return row ?? null;
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
        eq(landlordStatements.periodTo, parsed.to)
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
    .where(eq(landlordPayouts.branchId, branchId))
    .orderBy(desc(landlordPayouts.paidAt));
}
