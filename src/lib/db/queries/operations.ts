import { eq, and, desc, asc, ilike, or, sql, count, type SQL } from "drizzle-orm";
import { db } from "../index";
import { landlords, renters, tenancies, properties, branches } from "../schema";
import { parseBranchSettings, type BranchSettings } from "@/lib/branch-settings";
import {
  generatePaymentRefCode,
  getPaymentRefFromMetadata,
  withPaymentRef,
} from "@/lib/payment-ref";

export const ADMIN_LIST_PAGE_SIZE = 50;

export type ListPageOpts = {
  branchId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  status?: string;
};

function pageOffset(page = 1, pageSize = ADMIN_LIST_PAGE_SIZE) {
  const p = Math.max(1, page);
  return { limit: pageSize, offset: (p - 1) * pageSize, page: p };
}

function personSearch(
  q: string,
  firstName: typeof landlords.firstName | typeof renters.firstName,
  lastName: typeof landlords.lastName | typeof renters.lastName,
  email: typeof landlords.email | typeof renters.email,
  phone: typeof landlords.phone | typeof renters.phone
): SQL {
  const pattern = `%${q}%`;
  return or(
    ilike(firstName, pattern),
    ilike(lastName, pattern),
    ilike(email, pattern),
    ilike(phone, pattern),
    sql`concat(${firstName}, ' ', ${lastName}) ilike ${pattern}`
  )!;
}

export async function listLandlords(branchId?: string) {
  if (branchId) {
    return db
      .select()
      .from(landlords)
      .where(eq(landlords.branchId, branchId))
      .orderBy(desc(landlords.createdAt));
  }
  return db.select().from(landlords).orderBy(desc(landlords.createdAt));
}

export async function searchLandlords(opts: ListPageOpts = {}) {
  const { branchId, q, sort = "newest" } = opts;
  const { limit, offset } = pageOffset(opts.page, opts.pageSize);
  const conditions: SQL[] = [];
  if (branchId) conditions.push(eq(landlords.branchId, branchId));
  if (q?.trim()) {
    conditions.push(
      personSearch(
        q.trim(),
        landlords.firstName,
        landlords.lastName,
        landlords.email,
        landlords.phone
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const propertyCount = sql<number>`(
    select count(*)::int from ${properties}
    where ${properties.landlordId} = ${landlords.id}
  )`.mapWith(Number);

  const orderBy =
    sort === "name"
      ? [asc(landlords.lastName), asc(landlords.firstName)]
      : [desc(landlords.createdAt)];

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        landlord: landlords,
        propertyCount,
      })
      .from(landlords)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(landlords).where(where),
  ]);

  return { rows, total: totalRow[0]?.total ?? 0 };
}

export async function countLandlords(branchId?: string) {
  const where = branchId ? eq(landlords.branchId, branchId) : undefined;
  const [row] = await db.select({ total: count() }).from(landlords).where(where);
  return row?.total ?? 0;
}

export async function getLandlordById(id: string) {
  const [row] = await db.select().from(landlords).where(eq(landlords.id, id)).limit(1);
  return row ?? null;
}

export async function createLandlord(data: {
  branchId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  bankDetails?: Record<string, unknown> | null;
}) {
  const [row] = await db
    .insert(landlords)
    .values({
      branchId: data.branchId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      bankDetails: data.bankDetails ?? null,
    })
    .returning();
  return row;
}

export async function updateLandlord(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    bankDetails: Record<string, unknown> | null;
  }>
) {
  const [row] = await db.update(landlords).set(data).where(eq(landlords.id, id)).returning();
  return row ?? null;
}

export async function deleteLandlord(id: string) {
  await db.delete(landlords).where(eq(landlords.id, id));
}

export async function listRenters(branchId?: string) {
  if (branchId) {
    return db
      .select()
      .from(renters)
      .where(eq(renters.branchId, branchId))
      .orderBy(desc(renters.createdAt));
  }
  return db.select().from(renters).orderBy(desc(renters.createdAt));
}

export async function searchRenters(opts: ListPageOpts = {}) {
  const { branchId, q, sort = "newest" } = opts;
  const { limit, offset } = pageOffset(opts.page, opts.pageSize);
  const conditions: SQL[] = [];
  if (branchId) conditions.push(eq(renters.branchId, branchId));
  if (q?.trim()) {
    conditions.push(
      personSearch(
        q.trim(),
        renters.firstName,
        renters.lastName,
        renters.email,
        renters.phone
      )
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const orderBy =
    sort === "name"
      ? [asc(renters.lastName), asc(renters.firstName)]
      : [desc(renters.createdAt)];

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(renters)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(renters).where(where),
  ]);

  return { rows, total: totalRow[0]?.total ?? 0 };
}

export async function countRenters(branchId?: string) {
  const where = branchId ? eq(renters.branchId, branchId) : undefined;
  const [row] = await db.select({ total: count() }).from(renters).where(where);
  return row?.total ?? 0;
}

export async function getRenterById(id: string) {
  const [row] = await db.select().from(renters).where(eq(renters.id, id)).limit(1);
  return row ?? null;
}

export async function createRenter(data: {
  branchId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  landlordId?: string | null;
}) {
  const [row] = await db
    .insert(renters)
    .values({
      branchId: data.branchId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      landlordId: data.landlordId,
    })
    .returning();
  return row;
}

export async function getRenterByEmail(email: string, branchId: string) {
  const [row] = await db
    .select()
    .from(renters)
    .where(and(eq(renters.email, email), eq(renters.branchId, branchId)))
    .limit(1);
  return row ?? null;
}

export async function updateRenter(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }>
) {
  const [row] = await db.update(renters).set(data).where(eq(renters.id, id)).returning();
  return row ?? null;
}

export async function listTenancies(branchId?: string) {
  const base = db
    .select({
      tenancy: tenancies,
      propertyAddress: properties.displayAddress,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id));

  if (branchId) {
    return base.where(eq(tenancies.branchId, branchId)).orderBy(desc(tenancies.startDate));
  }
  return base.orderBy(desc(tenancies.startDate));
}

export async function searchTenancies(opts: ListPageOpts = {}) {
  const { branchId, q, status } = opts;
  const { limit, offset } = pageOffset(opts.page, opts.pageSize);
  const conditions: SQL[] = [];
  if (branchId) conditions.push(eq(tenancies.branchId, branchId));
  if (status && status !== "all") conditions.push(eq(tenancies.status, status));
  if (q?.trim()) {
    const pattern = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(properties.displayAddress, pattern),
        ilike(properties.postcode, pattern),
        ilike(renters.firstName, pattern),
        ilike(renters.lastName, pattern),
        sql`concat(${renters.firstName}, ' ', ${renters.lastName}) ilike ${pattern}`
      )!
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow, activeRow] = await Promise.all([
    db
      .select({
        tenancy: tenancies,
        propertyId: properties.id,
        propertyAddress: properties.displayAddress,
        renterFirstName: renters.firstName,
        renterLastName: renters.lastName,
      })
      .from(tenancies)
      .innerJoin(properties, eq(tenancies.propertyId, properties.id))
      .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
      .where(where)
      .orderBy(desc(tenancies.startDate))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(tenancies)
      .innerJoin(properties, eq(tenancies.propertyId, properties.id))
      .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
      .where(where),
    db
      .select({ total: count() })
      .from(tenancies)
      .where(
        and(
          ...(branchId ? [eq(tenancies.branchId, branchId)] : []),
          eq(tenancies.status, "active")
        )
      ),
  ]);

  return {
    rows,
    total: totalRow[0]?.total ?? 0,
    activeCount: activeRow[0]?.total ?? 0,
  };
}

export async function getTenancyById(id: string) {
  const [row] = await db
    .select({
      tenancy: tenancies,
      property: properties,
      renter: renters,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(eq(tenancies.id, id))
    .limit(1);
  return row ?? null;
}

export async function getActiveTenancyForRenter(renterId: string, branchId: string) {
  const [row] = await db
    .select()
    .from(tenancies)
    .where(
      and(
        eq(tenancies.primaryRenterId, renterId),
        eq(tenancies.branchId, branchId),
        eq(tenancies.status, "active")
      )
    )
    .orderBy(desc(tenancies.startDate))
    .limit(1);
  return row ?? null;
}

async function allocateUniquePaymentRef(branchId: string): Promise<string> {
  const existing = await db
    .select({ metadata: tenancies.metadata })
    .from(tenancies)
    .where(eq(tenancies.branchId, branchId));
  const used = new Set(
    existing
      .map((r) => getPaymentRefFromMetadata(r.metadata))
      .filter((r): r is string => Boolean(r))
      .map((r) => r.toUpperCase())
  );

  for (let attempt = 0; attempt < 40; attempt++) {
    const code = generatePaymentRefCode();
    if (!used.has(code.toUpperCase())) return code;
  }
  throw new Error("Could not allocate a unique payment reference");
}

export async function createTenancy(data: {
  branchId: string;
  propertyId: string;
  primaryRenterId: string;
  rentAmount: number;
  depositAmount?: number | null;
  startDate: string;
  endDate?: string | null;
  depositScheme?: string | null;
}) {
  const paymentRef = await allocateUniquePaymentRef(data.branchId);
  const [row] = await db
    .insert(tenancies)
    .values({
      branchId: data.branchId,
      propertyId: data.propertyId,
      primaryRenterId: data.primaryRenterId,
      rentAmount: String(data.rentAmount),
      depositAmount: data.depositAmount != null ? String(data.depositAmount) : null,
      startDate: data.startDate,
      endDate: data.endDate,
      depositScheme: data.depositScheme,
      status: "active",
      metadata: withPaymentRef({}, paymentRef),
    })
    .returning();

  await db
    .update(properties)
    .set({ isVacant: false, status: "let_agreed", updatedAt: new Date() })
    .where(eq(properties.id, data.propertyId));

  const { seedTenancyComplianceChecklist } = await import("./compliance");
  await seedTenancyComplianceChecklist({
    branchId: data.branchId,
    propertyId: data.propertyId,
    tenancyId: row.id,
  });

  return row;
}

/** Assign payment_ref to active tenancies that do not have one yet. */
export async function backfillPaymentRefsForBranch(branchId: string): Promise<number> {
  const rows = await db
    .select()
    .from(tenancies)
    .where(and(eq(tenancies.branchId, branchId), eq(tenancies.status, "active")));

  let updated = 0;
  for (const row of rows) {
    if (getPaymentRefFromMetadata(row.metadata)) continue;
    const paymentRef = await allocateUniquePaymentRef(branchId);
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};
    await db
      .update(tenancies)
      .set({ metadata: withPaymentRef(meta, paymentRef) })
      .where(eq(tenancies.id, row.id));
    updated += 1;
  }
  return updated;
}

export async function endTenancy(id: string) {
  const tenancy = await db.select().from(tenancies).where(eq(tenancies.id, id)).limit(1);
  if (!tenancy[0]) return null;

  const [row] = await db
    .update(tenancies)
    .set({ status: "ended", endDate: new Date().toISOString().slice(0, 10) })
    .where(eq(tenancies.id, id))
    .returning();

  await db
    .update(properties)
    .set({ isVacant: true, updatedAt: new Date() })
    .where(eq(properties.id, tenancy[0].propertyId));

  return row ?? null;
}

export async function getBranchWithSettings(branchId: string) {
  const [row] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!row) return null;
  return { ...row, settings: parseBranchSettings(row.settings) };
}

export async function updateBranchSettings(branchId: string, settings: BranchSettings) {
  const current = await getBranchWithSettings(branchId);
  const merged = { ...(current?.settings ?? {}), ...settings };
  await db.update(branches).set({ settings: merged }).where(eq(branches.id, branchId));
  return merged;
}
