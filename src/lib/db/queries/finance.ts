import { eq, and, desc, gte, lte, sql, count, inArray } from "drizzle-orm";
import { db } from "../index";
import {
  invoices,
  payments,
  tenancies,
  properties,
  landlords,
  renters,
  ledgerEntries,
  paymentAllocations,
  paymentExceptions,
  tasks,
  branches,
} from "../schema";
import { getLateFeeRules, parseBranchSettings } from "@/lib/branch-settings";
import { isTenantPayableInvoiceType } from "@/lib/operations/maintenance/constants";

export async function listInvoices(branchId?: string) {
  const base = db
    .select({
      invoice: invoices,
      propertyAddress: properties.displayAddress,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      landlordFirstName: landlords.firstName,
      landlordLastName: landlords.lastName,
    })
    .from(invoices)
    .leftJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .leftJoin(
      properties,
      eq(properties.id, sql`coalesce(${invoices.propertyId}, ${tenancies.propertyId})`)
    )
    .leftJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .leftJoin(
      landlords,
      eq(landlords.id, sql`coalesce(${invoices.landlordId}, ${properties.landlordId})`)
    );

  if (branchId) {
    return base.where(eq(invoices.branchId, branchId)).orderBy(desc(invoices.dueDate));
  }
  return base.orderBy(desc(invoices.dueDate));
}

export async function getInvoiceById(id: string) {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row ?? null;
}

export async function getInvoiceForRenter(invoiceId: string, branchId: string, renterId: string) {
  const [row] = await db
    .select({ invoice: invoices })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.branchId, branchId),
        eq(tenancies.primaryRenterId, renterId),
        inArray(invoices.type, ["rent", "late_fee"])
      )
    )
    .limit(1);
  return row?.invoice ?? null;
}

export async function listInvoicesForRenter(branchId: string, renterId: string) {
  return db
    .select({ invoice: invoices })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .where(
      and(
        eq(invoices.branchId, branchId),
        eq(tenancies.primaryRenterId, renterId),
        inArray(invoices.type, ["rent", "late_fee"])
      )
    )
    .orderBy(desc(invoices.dueDate));
}

export async function getAllocatedTotalForInvoice(invoiceId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
    .from(paymentAllocations)
    .where(eq(paymentAllocations.invoiceId, invoiceId));
  return Number(row?.total ?? 0);
}

async function getTenancyContext(tenancyId: string) {
  const [row] = await db
    .select({
      tenancyId: tenancies.id,
      branchId: tenancies.branchId,
      propertyId: tenancies.propertyId,
      landlordId: properties.landlordId,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .where(eq(tenancies.id, tenancyId))
    .limit(1);
  return row ?? null;
}

export async function insertLedgerEntry(data: {
  branchId: string;
  tenancyId: string;
  propertyId?: string | null;
  landlordId?: string | null;
  entryType: string;
  amount: number;
  invoiceId?: string | null;
  paymentId?: string | null;
  memo?: string | null;
  meta?: Record<string, unknown>;
  occurredAt?: Date;
}) {
  const [row] = await db
    .insert(ledgerEntries)
    .values({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      propertyId: data.propertyId ?? null,
      landlordId: data.landlordId ?? null,
      entryType: data.entryType,
      amount: String(data.amount),
      invoiceId: data.invoiceId ?? null,
      paymentId: data.paymentId ?? null,
      memo: data.memo ?? null,
      meta: data.meta ?? {},
      occurredAt: data.occurredAt ?? new Date(),
    })
    .returning();
  return row;
}

export async function getTenancyBalance(tenancyId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.tenancyId, tenancyId));
  return Number(row?.total ?? 0);
}

export async function createInvoices(
  rows: {
    branchId: string;
    tenancyId?: string | null;
    propertyId?: string | null;
    landlordId?: string | null;
    workOrderId?: string | null;
    type: string;
    dueDate: string;
    amount: number;
    status?: string;
    meta?: Record<string, unknown>;
  }[]
) {
  if (rows.length === 0) return [];

  const values = [];
  for (const r of rows) {
    const ctx = r.tenancyId ? await getTenancyContext(r.tenancyId) : null;
    values.push({
      branchId: r.branchId,
      tenancyId: r.tenancyId ?? ctx?.tenancyId ?? null,
      propertyId: r.propertyId ?? ctx?.propertyId ?? null,
      landlordId: r.landlordId ?? ctx?.landlordId ?? null,
      workOrderId: r.workOrderId ?? null,
      type: r.type,
      dueDate: r.dueDate,
      amount: String(r.amount),
      status: r.status ?? "due",
      meta: r.meta ?? {},
    });
  }

  const created = await db.insert(invoices).values(values).returning();

  for (const inv of created) {
    if (!inv.tenancyId || !isTenantPayableInvoiceType(inv.type)) continue;
    const ctx = await getTenancyContext(inv.tenancyId);
    await insertLedgerEntry({
      branchId: inv.branchId,
      tenancyId: inv.tenancyId,
      propertyId: ctx?.propertyId ?? inv.propertyId,
      landlordId: ctx?.landlordId ?? inv.landlordId,
      entryType: "charge",
      amount: Number(inv.amount),
      invoiceId: inv.id,
      memo: `${inv.type} charge due ${inv.dueDate}`,
    });
  }

  return created;
}

async function refreshInvoiceStatus(invoiceId: string) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice || invoice.status === "void") return invoice;

  const allocated = await getAllocatedTotalForInvoice(invoiceId);
  const amount = Number(invoice.amount);
  let status = "due";
  if (allocated <= 0) status = "due";
  else if (allocated + 0.001 >= amount) status = "paid";
  else status = "partial";

  const [updated] = await db
    .update(invoices)
    .set({ status })
    .where(eq(invoices.id, invoiceId))
    .returning();
  return updated ?? null;
}

/**
 * Record a payment and allocate to an invoice. Supports partials and overpayments.
 */
export async function recordPaymentAndAllocate(data: {
  branchId: string;
  tenancyId: string;
  invoiceId: string;
  amount: number;
  method: string;
  externalRef?: string | null;
}) {
  const invoice = await getInvoiceById(data.invoiceId);
  if (!invoice) return null;
  if (!isTenantPayableInvoiceType(invoice.type) || !invoice.tenancyId) return null;
  if (invoice.status === "paid" || invoice.status === "void") {
    return { payment: null, invoice, exception: null };
  }

  const ctx = await getTenancyContext(data.tenancyId);
  const already = await getAllocatedTotalForInvoice(data.invoiceId);
  const remaining = Math.max(0, Number(invoice.amount) - already);
  const payAmount = data.amount;
  const allocateAmount = Math.min(payAmount, remaining);
  const overpay = payAmount - allocateAmount;

  const [payment] = await db
    .insert(payments)
    .values({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      invoiceId: data.invoiceId,
      amount: String(payAmount),
      method: data.method,
      externalRef: data.externalRef,
    })
    .returning();

  if (allocateAmount > 0) {
    await db.insert(paymentAllocations).values({
      branchId: data.branchId,
      paymentId: payment.id,
      invoiceId: data.invoiceId,
      amount: String(allocateAmount),
    });
  }

  await insertLedgerEntry({
    branchId: data.branchId,
    tenancyId: data.tenancyId,
    propertyId: ctx?.propertyId,
    landlordId: ctx?.landlordId,
    entryType: "payment",
    amount: -payAmount,
    invoiceId: data.invoiceId,
    paymentId: payment.id,
    memo: `Payment via ${data.method}`,
  });

  if (allocateAmount > 0) {
    await insertLedgerEntry({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      propertyId: ctx?.propertyId,
      landlordId: ctx?.landlordId,
      entryType: "allocation",
      amount: 0,
      invoiceId: data.invoiceId,
      paymentId: payment.id,
      memo: `Allocated £${allocateAmount.toFixed(2)} to invoice`,
      meta: { allocated: allocateAmount },
    });

    if (ctx?.landlordId) {
      const { postRentReceivedToLandlord } = await import("./landlord-finance");
      await postRentReceivedToLandlord({
        branchId: data.branchId,
        landlordId: ctx.landlordId,
        propertyId: ctx.propertyId,
        tenancyId: data.tenancyId,
        rentAmount: allocateAmount,
        paymentId: payment.id,
      });
    }
  }

  let exception = null;
  if (overpay > 0.001) {
    exception = await createPaymentException({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      paymentId: payment.id,
      invoiceId: data.invoiceId,
      kind: "overpayment",
      amount: overpay,
      note: `Overpayment of £${overpay.toFixed(2)}`,
    });
  } else if (payAmount + 0.001 < remaining && payAmount > 0) {
    exception = await createPaymentException({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      paymentId: payment.id,
      invoiceId: data.invoiceId,
      kind: "underpayment",
      amount: remaining - payAmount,
      note: `Partial payment; £${(remaining - payAmount).toFixed(2)} remaining`,
    });
  }

  const updatedInvoice = await refreshInvoiceStatus(data.invoiceId);
  return { payment, invoice: updatedInvoice, exception };
}

export async function markInvoicePaid(invoiceId: string, method = "bank_transfer") {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice || invoice.status === "paid" || invoice.status === "void") return null;
  if (!isTenantPayableInvoiceType(invoice.type) || !invoice.tenancyId) return null;

  const already = await getAllocatedTotalForInvoice(invoiceId);
  const remaining = Number(invoice.amount) - already;
  if (remaining <= 0) {
    await refreshInvoiceStatus(invoiceId);
    return getInvoiceById(invoiceId);
  }

  const result = await recordPaymentAndAllocate({
    branchId: invoice.branchId,
    tenancyId: invoice.tenancyId,
    invoiceId: invoice.id,
    amount: remaining,
    method,
  });
  return result?.invoice ?? null;
}

export async function markInvoicePartialPaid(
  invoiceId: string,
  amount: number,
  method = "bank_transfer"
) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice || invoice.status === "paid" || invoice.status === "void") return null;
  if (!isTenantPayableInvoiceType(invoice.type) || !invoice.tenancyId) return null;

  const result = await recordPaymentAndAllocate({
    branchId: invoice.branchId,
    tenancyId: invoice.tenancyId,
    invoiceId: invoice.id,
    amount,
    method,
  });
  return result;
}

export async function insertPayment(data: {
  branchId: string;
  tenancyId: string;
  invoiceId: string;
  amount: number;
  method: string;
  externalRef?: string | null;
}) {
  const result = await recordPaymentAndAllocate(data);
  return result?.payment ?? null;
}

export async function createPaymentException(data: {
  branchId: string;
  tenancyId?: string | null;
  paymentId?: string | null;
  invoiceId?: string | null;
  kind: string;
  amount: number;
  note?: string | null;
  meta?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(paymentExceptions)
    .values({
      branchId: data.branchId,
      tenancyId: data.tenancyId ?? null,
      paymentId: data.paymentId ?? null,
      invoiceId: data.invoiceId ?? null,
      kind: data.kind,
      amount: String(data.amount),
      note: data.note ?? null,
      meta: data.meta ?? {},
    })
    .returning();
  return row;
}

export async function listPaymentExceptions(branchId: string, status = "open") {
  return db
    .select({
      exception: paymentExceptions,
      propertyAddress: properties.displayAddress,
    })
    .from(paymentExceptions)
    .leftJoin(tenancies, eq(paymentExceptions.tenancyId, tenancies.id))
    .leftJoin(properties, eq(tenancies.propertyId, properties.id))
    .where(and(eq(paymentExceptions.branchId, branchId), eq(paymentExceptions.status, status)))
    .orderBy(desc(paymentExceptions.createdAt));
}

export async function resolvePaymentException(id: string) {
  const [row] = await db
    .update(paymentExceptions)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(paymentExceptions.id, id))
    .returning();
  return row ?? null;
}

export async function listArrears(branchId: string) {
  const balanceRows = await db
    .select({
      tenancyId: ledgerEntries.tenancyId,
      balance: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.branchId, branchId))
    .groupBy(ledgerEntries.tenancyId);

  const balanceByTenancy = new Map(
    balanceRows.map((r) => [r.tenancyId, Number(r.balance)])
  );

  const active = await db
    .select({
      tenancyId: tenancies.id,
      rentAmount: tenancies.rentAmount,
      propertyAddress: properties.displayAddress,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(and(eq(tenancies.branchId, branchId), eq(tenancies.status, "active")));

  const openInvoices = await db
    .select({
      tenancyId: invoices.tenancyId,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(
      and(eq(invoices.branchId, branchId), inArray(invoices.status, ["due", "partial"]))
    );

  const oldestDueByTenancy = new Map<string, string>();
  for (const inv of openInvoices) {
    if (!inv.tenancyId) continue;
    const cur = oldestDueByTenancy.get(inv.tenancyId);
    if (!cur || inv.dueDate < cur) oldestDueByTenancy.set(inv.tenancyId, inv.dueDate);
  }

  const today = new Date();
  return active
    .map((r) => {
      const balance = balanceByTenancy.get(r.tenancyId) ?? 0;
      const oldestDue = oldestDueByTenancy.get(r.tenancyId) ?? null;
      let daysOverdue = 0;
      if (oldestDue && balance > 0.001) {
        const due = new Date(oldestDue);
        daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
      }
      return {
        tenancyId: r.tenancyId,
        propertyAddress: r.propertyAddress,
        renterName: `${r.renterFirstName} ${r.renterLastName}`.trim(),
        rentAmount: Number(r.rentAmount),
        balance,
        daysOverdue,
        oldestDue,
      };
    })
    .filter((r) => r.balance > 0.001)
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.balance - a.balance);
}

export async function createTask(data: {
  branchId: string;
  title: string;
  dueAt?: Date | null;
  relatedType?: string | null;
  relatedId?: string | null;
  meta?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(tasks)
    .values({
      branchId: data.branchId,
      title: data.title,
      dueAt: data.dueAt ?? null,
      relatedType: data.relatedType ?? null,
      relatedId: data.relatedId ?? null,
      meta: data.meta ?? {},
    })
    .returning();
  return row;
}

export async function applyLateFeesForBranch(branchId: string) {
  const [b] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!b) return { applied: 0 };

  const rules = getLateFeeRules(parseBranchSettings(b.settings));
  if (rules.enabled === false) return { applied: 0 };

  const graceDays = rules.grace_days ?? 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - graceDays);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const overdue = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.branchId, branchId),
        inArray(invoices.status, ["due", "partial"]),
        lte(invoices.dueDate, cutoffDate),
        eq(invoices.type, "rent")
      )
    );

  let applied = 0;
  for (const inv of overdue) {
    if (!inv.tenancyId) continue;
    const existingFee = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenancyId, inv.tenancyId),
          eq(invoices.type, "late_fee"),
          sql`${invoices.meta}->>'source_invoice_id' = ${inv.id}`
        )
      )
      .limit(1);
    if (existingFee.length) continue;

    let feeAmount = rules.fixed_amount ?? 25;
    if (rules.percent != null && rules.percent > 0) {
      feeAmount = Math.round(Number(inv.amount) * (rules.percent / 100) * 100) / 100;
    }

    const [feeInv] = await db
      .insert(invoices)
      .values({
        branchId,
        tenancyId: inv.tenancyId,
        type: "late_fee",
        dueDate: new Date().toISOString().slice(0, 10),
        amount: String(feeAmount),
        status: "due",
        meta: { source_invoice_id: inv.id },
      })
      .returning();

    const ctx = await getTenancyContext(inv.tenancyId);
    await insertLedgerEntry({
      branchId,
      tenancyId: inv.tenancyId,
      propertyId: ctx?.propertyId,
      landlordId: ctx?.landlordId,
      entryType: "late_fee",
      amount: feeAmount,
      invoiceId: feeInv.id,
      memo: `Late fee for invoice ${inv.id}`,
      meta: { source_invoice_id: inv.id },
    });

    await createTask({
      branchId,
      title: `Late fee applied — chase arrears`,
      relatedType: "tenancy",
      relatedId: inv.tenancyId,
      meta: { invoice_id: feeInv.id, source_invoice_id: inv.id },
    });

    applied += 1;
  }

  return { applied };
}

export async function getPaymentByExternalRef(branchId: string, externalRef: string) {
  const [row] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.branchId, branchId), eq(payments.externalRef, externalRef)))
    .limit(1);
  return row ?? null;
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  await db.update(invoices).set({ status }).where(eq(invoices.id, invoiceId));
}

export async function getActiveTenanciesForRent(branchId: string) {
  return db
    .select({ id: tenancies.id, rentAmount: tenancies.rentAmount })
    .from(tenancies)
    .where(and(eq(tenancies.branchId, branchId), eq(tenancies.status, "active")));
}

export async function getExistingRentInvoicesForDueDate(
  branchId: string,
  dueDate: string,
  tenancyIds: string[]
) {
  if (tenancyIds.length === 0) return [];
  return db
    .select({ tenancyId: invoices.tenancyId })
    .from(invoices)
    .where(
      and(
        eq(invoices.branchId, branchId),
        eq(invoices.type, "rent"),
        eq(invoices.dueDate, dueDate),
        inArray(invoices.tenancyId, tenancyIds)
      )
    );
}

export async function countOverdueInvoices(branchId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [r] = await db
    .select({ value: count() })
    .from(invoices)
    .where(
      and(
        eq(invoices.branchId, branchId),
        inArray(invoices.status, ["due", "partial"]),
        lte(invoices.dueDate, today),
        inArray(invoices.type, ["rent", "late_fee"])
      )
    );
  return r?.value ?? 0;
}

export interface LandlordStatementRow {
  landlordId: string;
  name: string;
  paymentCount: number;
  total: number;
}

export async function getLandlordStatementData(
  branchId: string,
  from: string,
  to: string
): Promise<LandlordStatementRow[]> {
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const rows = await db
    .select({
      amount: payments.amount,
      landlordId: landlords.id,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
    })
    .from(payments)
    .innerJoin(tenancies, eq(payments.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(landlords, eq(properties.landlordId, landlords.id))
    .where(
      and(
        eq(payments.branchId, branchId),
        gte(payments.paidAt, new Date(fromIso)),
        lte(payments.paidAt, new Date(toIso))
      )
    );

  const byLandlord = new Map<string, LandlordStatementRow>();
  for (const row of rows) {
    if (!row.landlordId) continue;
    const cur = byLandlord.get(row.landlordId) ?? {
      landlordId: row.landlordId,
      name: `${row.firstName} ${row.lastName}`.trim(),
      paymentCount: 0,
      total: 0,
    };
    cur.total += Number(row.amount);
    cur.paymentCount += 1;
    byLandlord.set(row.landlordId, cur);
  }

  return [...byLandlord.values()].sort((a, b) => a.name.localeCompare(b.name));
}
