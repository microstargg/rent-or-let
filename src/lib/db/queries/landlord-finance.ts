import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../index";
import {
  landlordLedgerEntries,
  landlordStatements,
  landlordPayouts,
  landlords,
  branches,
  documents,
} from "../schema";
import { getManagementFeePercent, parseBranchSettings } from "@/lib/branch-settings";
import { createDocument } from "./compliance";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function insertLandlordLedgerEntry(data: {
  branchId: string;
  landlordId: string;
  propertyId?: string | null;
  tenancyId?: string | null;
  entryType: string;
  amount: number;
  paymentId?: string | null;
  workOrderId?: string | null;
  statementId?: string | null;
  memo?: string | null;
  meta?: Record<string, unknown>;
  occurredAt?: Date;
}) {
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
  amount: number;
  memo?: string;
}) {
  return insertLandlordLedgerEntry({
    branchId: data.branchId,
    landlordId: data.landlordId,
    propertyId: data.propertyId,
    tenancyId: data.tenancyId,
    entryType: "work_order_cost",
    amount: -Math.abs(data.amount),
    workOrderId: data.workOrderId,
    memo: data.memo ?? "Maintenance cost",
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
    { rent: number; fees: number; costs: number; adjustments: number; net: number; count: number }
  >();

  for (const e of entries) {
    const cur = byLandlord.get(e.landlordId) ?? {
      rent: 0,
      fees: 0,
      costs: 0,
      adjustments: 0,
      net: 0,
      count: 0,
    };
    const amt = Number(e.amount);
    cur.net += amt;
    cur.count += 1;
    if (e.entryType === "rent_received") cur.rent += amt;
    else if (e.entryType === "management_fee") cur.fees += amt;
    else if (e.entryType === "work_order_cost") cur.costs += amt;
    else cur.adjustments += amt;
    byLandlord.set(e.landlordId, cur);
  }

  const created = [];
  for (const [landlordId, totals] of byLandlord) {
    const [ll] = await db.select().from(landlords).where(eq(landlords.id, landlordId)).limit(1);
    const body = [
      `Landlord statement`,
      `Landlord: ${ll ? `${ll.firstName} ${ll.lastName}` : landlordId}`,
      `Period: ${from} to ${to}`,
      `Rent received: £${totals.rent.toFixed(2)}`,
      `Management fees: £${totals.fees.toFixed(2)}`,
      `Costs: £${totals.costs.toFixed(2)}`,
      `Adjustments: £${totals.adjustments.toFixed(2)}`,
      `Net: £${totals.net.toFixed(2)}`,
      `Entries: ${totals.count}`,
    ].join("\n");

    const dir = join(process.cwd(), "public", "uploads", "statements", landlordId);
    await mkdir(dir, { recursive: true });
    const filename = `statement-${from}-${to}-${Date.now()}.txt`;
    await writeFile(join(dir, filename), body);
    const url = `/uploads/statements/${landlordId}/${filename}`;

    const doc = await createDocument({
      branchId,
      entityType: "landlord",
      entityId: landlordId,
      kind: "statement",
      url,
      filename,
    });

    const [stmt] = await db
      .insert(landlordStatements)
      .values({
        branchId,
        landlordId,
        periodFrom: from,
        periodTo: to,
        totals,
        documentId: doc.id,
        status: "issued",
        issuedAt: new Date(),
      })
      .returning();
    created.push({ statement: stmt, document: doc, name: ll ? `${ll.firstName} ${ll.lastName}` : "" });
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
