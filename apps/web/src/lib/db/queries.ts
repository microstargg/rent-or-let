import { eq, and, or, gte, lte, ilike, desc, asc, sql, count } from "drizzle-orm";
import { db } from "./index";
import { agencyEq, currentAgencyId, ensureAgency } from "./agency-scope";
import {
  properties,
  propertyImages,
  branches,
  staffProfiles,
  enquiries,
  tenantApplications,
  complaints,
  portalSyncLogs,
  cookieConsents,
  landlords,
} from "./schema";
import type { Property, PropertyImage } from "@/types";

function mapProperty(
  row: typeof properties.$inferSelect,
  images: PropertyImage[] = []
): Property {
  return {
    id: row.id,
    branch_id: row.branchId,
    agent_ref: row.agentRef,
    slug: row.slug,
    display_address: row.displayAddress,
    house_name_number: row.houseNameNumber,
    street: row.street,
    town: row.town,
    postcode: row.postcode,
    price_pcm: Number(row.pricePcm),
    deposit: Number(row.deposit),
    holding_deposit: row.holdingDeposit ? Number(row.holdingDeposit) : undefined,
    available_from: row.availableFrom,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    property_type: row.propertyType as Property["property_type"],
    furnished: row.furnished as Property["furnished"],
    status: row.status as Property["status"],
    description: row.description,
    summary: row.summary ?? undefined,
    features: (row.features as string[]) ?? [],
    permitted_payments: (row.permittedPayments as string[]) ?? undefined,
    epc_rating: row.epcRating ?? undefined,
    virtual_tour_url: row.virtualTourUrl ?? undefined,
    floorplan_url: row.floorplanUrl ?? undefined,
    epc_url: row.epcUrl ?? undefined,
    portal_sync: (row.portalSync as Property["portal_sync"]) ?? {},
    landlord_id: row.landlordId ?? undefined,
    is_vacant: row.isVacant,
    published_at: row.publishedAt?.toISOString(),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    images,
  };
}

function mapImage(row: typeof propertyImages.$inferSelect): PropertyImage {
  return {
    id: row.id,
    property_id: row.propertyId,
    url: row.url,
    alt_text: row.altText ?? undefined,
    sort_order: row.sortOrder,
    is_primary: row.isPrimary,
  };
}

export async function getAvailableProperties(filters?: {
  minBedrooms?: number;
  maxRent?: number;
  town?: string;
}): Promise<Property[]> {
  await ensureAgency();
  const conditions = [agencyEq(properties.agencyId), eq(properties.status, "available")];
  if (filters?.minBedrooms) conditions.push(gte(properties.bedrooms, filters.minBedrooms));
  if (filters?.maxRent) conditions.push(lte(properties.pricePcm, String(filters.maxRent)));
  if (filters?.town) conditions.push(ilike(properties.town, `%${filters.town}%`));

  const rows = await db
    .select()
    .from(properties)
    .where(and(...conditions))
    .orderBy(desc(properties.publishedAt));

  return Promise.all(
    rows.map(async (row) => {
      const images = await db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.propertyId, row.id))
        .orderBy(asc(propertyImages.sortOrder));
      return mapProperty(row, images.map(mapImage));
    })
  );
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(properties)
    .where(and(agencyEq(properties.agencyId), eq(properties.slug, slug), eq(properties.status, "available")))
    .limit(1);

  if (!row) return null;

  const images = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, row.id))
    .orderBy(asc(propertyImages.sortOrder));

  return mapProperty(row, images.map(mapImage));
}

export async function getPropertyById(id: string) {
  await ensureAgency();
  const [row] = await db.select().from(properties).where(and(eq(properties.id, id), agencyEq(properties.agencyId))).limit(1);
  if (!row) return null;

  const images = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, id))
    .orderBy(asc(propertyImages.sortOrder));

  return mapProperty(row, images.map(mapImage));
}

export async function listAllProperties() {
  await ensureAgency();
  return db.select().from(properties).where(agencyEq(properties.agencyId)).orderBy(desc(properties.updatedAt));
}

export async function searchProperties(opts: {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  await ensureAgency();
  const pageSize = opts.pageSize ?? 50;
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;
  const conditions = [agencyEq(properties.agencyId)];
  if (opts.status && opts.status !== "all") {
    conditions.push(eq(properties.status, opts.status));
  }
  if (opts.q?.trim()) {
    const pattern = `%${opts.q.trim()}%`;
    conditions.push(
      or(
        ilike(properties.displayAddress, pattern),
        ilike(properties.town, pattern),
        ilike(properties.postcode, pattern),
        ilike(properties.agentRef, pattern),
        ilike(properties.street, pattern)
      )!
    );
  }
  const where = and(...conditions);

  const orderBy =
    opts.sort === "address"
      ? [asc(properties.displayAddress)]
      : opts.sort === "rent"
        ? [desc(properties.pricePcm)]
        : [desc(properties.updatedAt)];

  const [rows, totalRow, stats] = await Promise.all([
    db
      .select({
        property: properties,
        landlordFirstName: landlords.firstName,
        landlordLastName: landlords.lastName,
      })
      .from(properties)
      .leftJoin(landlords, eq(properties.landlordId, landlords.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(properties).where(where),
    db
      .select({
        total: count(),
        available: sql<number>`count(*) filter (where ${properties.status} = 'available')`.mapWith(
          Number
        ),
        vacant: sql<number>`count(*) filter (where ${properties.isVacant} = true)`.mapWith(Number),
      })
      .from(properties)
      .where(agencyEq(properties.agencyId)),
  ]);

  return {
    rows,
    total: totalRow[0]?.total ?? 0,
    stats: {
      total: stats[0]?.total ?? 0,
      available: stats[0]?.available ?? 0,
      vacant: stats[0]?.vacant ?? 0,
    },
  };
}

export async function createProperty(data: {
  branchId: string;
  agentRef: string;
  slug: string;
  displayAddress: string;
  houseNameNumber: string;
  street: string;
  town: string;
  postcode: string;
  pricePcm: number;
  deposit: number;
  holdingDeposit?: number | null;
  availableFrom: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  furnished: string;
  status: string;
  description: string;
  summary?: string | null;
  features?: string[];
  epcRating?: string | null;
  virtualTourUrl?: string | null;
  floorplanUrl?: string | null;
  epcUrl?: string | null;
  publishedAt?: Date | null;
  landlordId?: string | null;
  isVacant?: boolean;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(properties)
    .values({
      agencyId: currentAgencyId(),
      branchId: data.branchId,
      agentRef: data.agentRef,
      slug: data.slug,
      displayAddress: data.displayAddress,
      houseNameNumber: data.houseNameNumber,
      street: data.street,
      town: data.town,
      postcode: data.postcode,
      pricePcm: String(data.pricePcm),
      deposit: String(data.deposit),
      holdingDeposit: data.holdingDeposit != null ? String(data.holdingDeposit) : null,
      availableFrom: data.availableFrom,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      propertyType: data.propertyType,
      furnished: data.furnished,
      status: data.status,
      description: data.description,
      summary: data.summary,
      features: data.features ?? [],
      epcRating: data.epcRating,
      virtualTourUrl: data.virtualTourUrl,
      floorplanUrl: data.floorplanUrl,
      epcUrl: data.epcUrl,
      publishedAt: data.publishedAt,
      landlordId: data.landlordId,
      isVacant: data.isVacant ?? true,
      portalSync: {},
    })
    .returning({ id: properties.id });

  return row;
}

export async function updateProperty(
  id: string,
  data: Partial<{
    branchId: string;
    agentRef: string;
    slug: string;
    displayAddress: string;
    houseNameNumber: string;
    street: string;
    town: string;
    postcode: string;
    pricePcm: number;
    deposit: number;
    holdingDeposit: number | null;
    availableFrom: string;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    furnished: string;
    status: string;
    description: string;
    summary: string | null;
    features: string[];
    epcRating: string | null;
    virtualTourUrl: string | null;
    floorplanUrl: string | null;
    epcUrl: string | null;
    publishedAt: Date | null;
    portalSync: Record<string, unknown>;
    landlordId: string | null;
    isVacant: boolean;
    metadata: Record<string, unknown>;
  }>
) {
  await ensureAgency();
  await db
    .update(properties)
    .set({
      ...(data.branchId && { branchId: data.branchId }),
      ...(data.agentRef && { agentRef: data.agentRef }),
      ...(data.slug && { slug: data.slug }),
      ...(data.displayAddress && { displayAddress: data.displayAddress }),
      ...(data.houseNameNumber !== undefined && { houseNameNumber: data.houseNameNumber }),
      ...(data.street && { street: data.street }),
      ...(data.town && { town: data.town }),
      ...(data.postcode && { postcode: data.postcode }),
      ...(data.pricePcm !== undefined && { pricePcm: String(data.pricePcm) }),
      ...(data.deposit !== undefined && { deposit: String(data.deposit) }),
      ...(data.holdingDeposit !== undefined && {
        holdingDeposit: data.holdingDeposit != null ? String(data.holdingDeposit) : null,
      }),
      ...(data.availableFrom && { availableFrom: data.availableFrom }),
      ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
      ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
      ...(data.propertyType && { propertyType: data.propertyType }),
      ...(data.furnished && { furnished: data.furnished }),
      ...(data.status && { status: data.status }),
      ...(data.description && { description: data.description }),
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.features && { features: data.features }),
      ...(data.epcRating !== undefined && { epcRating: data.epcRating }),
      ...(data.virtualTourUrl !== undefined && { virtualTourUrl: data.virtualTourUrl }),
      ...(data.floorplanUrl !== undefined && { floorplanUrl: data.floorplanUrl }),
      ...(data.epcUrl !== undefined && { epcUrl: data.epcUrl }),
      ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt }),
      ...(data.portalSync && { portalSync: data.portalSync }),
      ...(data.landlordId !== undefined && { landlordId: data.landlordId }),
      ...(data.isVacant !== undefined && { isVacant: data.isVacant }),
      ...(data.metadata && { metadata: data.metadata }),
      updatedAt: new Date(),
    })
    .where(and(eq(properties.id, id), agencyEq(properties.agencyId)));
}

export async function getPropertyWithBranch(id: string) {
  await ensureAgency();
  const [row] = await db
    .select({ property: properties, branch: branches })
    .from(properties)
    .innerJoin(branches, eq(properties.branchId, branches.id))
    .where(and(eq(properties.id, id), agencyEq(properties.agencyId)))
    .limit(1);

  if (!row) return null;

  const images = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, id))
    .orderBy(asc(propertyImages.sortOrder));

  return {
    property: mapProperty(row.property, images.map(mapImage)),
    branch: row.branch,
    metadata: (row.property.metadata ?? {}) as Record<string, unknown>,
  };
}

export async function getPropertyMetadata(id: string): Promise<Record<string, unknown>> {
  await ensureAgency();
  const [row] = await db
    .select({ metadata: properties.metadata })
    .from(properties)
    .where(and(eq(properties.id, id), agencyEq(properties.agencyId)))
    .limit(1);
  return (row?.metadata ?? {}) as Record<string, unknown>;
}

export async function mergePropertyMetadata(id: string, patch: Record<string, unknown>) {
  await ensureAgency();
  const current = await getPropertyMetadata(id);
  await db
    .update(properties)
    .set({ metadata: { ...current, ...patch }, updatedAt: new Date() })
    .where(and(eq(properties.id, id), agencyEq(properties.agencyId)));
}

export async function addPropertyImage(data: {
  propertyId: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}) {
  await ensureAgency();
  await db.insert(propertyImages).values({
    propertyId: data.propertyId,
    url: data.url,
    sortOrder: data.sortOrder,
    isPrimary: data.isPrimary,
  });
}

export async function countPropertyImages(propertyId: string) {
  await ensureAgency();
  const [result] = await db
    .select({ value: count() })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, propertyId));
  return result?.value ?? 0;
}

export async function getPropertyImage(imageId: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.id, imageId))
    .limit(1);
  return row ?? null;
}

export async function deletePropertyImage(imageId: string) {
  await ensureAgency();
  const image = await getPropertyImage(imageId);
  if (!image) return null;

  await db.delete(propertyImages).where(eq(propertyImages.id, imageId));

  const remaining = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, image.propertyId))
    .orderBy(asc(propertyImages.sortOrder));

  if (remaining.length === 0) return image.propertyId;

  const hasPrimary = remaining.some((row) => row.isPrimary);
  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(propertyImages)
      .set({
        sortOrder: i,
        ...(i === 0 && !hasPrimary ? { isPrimary: true } : {}),
      })
      .where(eq(propertyImages.id, remaining[i].id));
  }

  return image.propertyId;
}

export async function setPropertyImagePrimary(imageId: string) {
  await ensureAgency();
  const image = await getPropertyImage(imageId);
  if (!image) return null;

  await db
    .update(propertyImages)
    .set({ isPrimary: false })
    .where(eq(propertyImages.propertyId, image.propertyId));
  await db.update(propertyImages).set({ isPrimary: true }).where(eq(propertyImages.id, imageId));

  return image.propertyId;
}

export async function reorderPropertyImages(propertyId: string, imageIds: string[]) {
  await ensureAgency();
  for (let i = 0; i < imageIds.length; i++) {
    await db
      .update(propertyImages)
      .set({ sortOrder: i })
      .where(and(eq(propertyImages.id, imageIds[i]), eq(propertyImages.propertyId, propertyId)));
  }
}

export async function insertEnquiry(data: {
  propertyId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  source?: string;
}) {
  await ensureAgency();
  await db.insert(enquiries).values({
    agencyId: currentAgencyId(),
    propertyId: data.propertyId ?? null,
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.message,
    source: data.source ?? "website",
    status: "new",
  });
}

export async function listEnquiries() {
  await ensureAgency();
  return db
    .select({
      enquiry: enquiries,
      displayAddress: properties.displayAddress,
    })
    .from(enquiries)
    .leftJoin(properties, eq(enquiries.propertyId, properties.id))
    .where(agencyEq(enquiries.agencyId))
    .orderBy(desc(enquiries.createdAt));
}

export async function updateEnquiryStatus(id: string, status: string) {
  await ensureAgency();
  await db.update(enquiries).set({ status }).where(and(eq(enquiries.id, id), agencyEq(enquiries.agencyId)));
}

export async function insertTenantApplication(data: {
  propertyId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentStatus: string;
  annualIncome?: number | null;
  currentAddress: string;
  moveInDate?: string | null;
  occupants: number;
  pets: boolean;
  petsDetails?: string | null;
  additionalInfo?: string | null;
}) {
  await ensureAgency();
  await db.insert(tenantApplications).values({
    agencyId: currentAgencyId(),
    propertyId: data.propertyId ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    employmentStatus: data.employmentStatus,
    annualIncome: data.annualIncome != null ? String(data.annualIncome) : null,
    currentAddress: data.currentAddress,
    moveInDate: data.moveInDate,
    occupants: data.occupants,
    pets: data.pets,
    petsDetails: data.petsDetails,
    additionalInfo: data.additionalInfo,
    status: "submitted",
  });
}

export async function listTenantApplications() {
  await ensureAgency();
  return db
    .select({
      application: tenantApplications,
      displayAddress: properties.displayAddress,
    })
    .from(tenantApplications)
    .leftJoin(properties, eq(tenantApplications.propertyId, properties.id))
    .where(agencyEq(tenantApplications.agencyId))
    .orderBy(desc(tenantApplications.createdAt));
}

export async function updateApplicationStatus(id: string, status: string) {
  await ensureAgency();
  await db
    .update(tenantApplications)
    .set({ status })
    .where(and(eq(tenantApplications.id, id), agencyEq(tenantApplications.agencyId)));
}

export async function insertComplaint(data: {
  propertyId?: string | null;
  tenantName: string;
  tenantEmail: string;
  subject: string;
  description: string;
  source?: string;
  slaDueAt?: Date;
}) {
  await ensureAgency();
  await db.insert(complaints).values({
    agencyId: currentAgencyId(),
    propertyId: data.propertyId ?? null,
    tenantName: data.tenantName,
    tenantEmail: data.tenantEmail,
    subject: data.subject,
    description: data.description,
    status: "open",
    priority: "medium",
    source: data.source ?? "website",
    slaDueAt: data.slaDueAt,
  });
}

export async function listComplaints() {
  await ensureAgency();
  return db.select().from(complaints).where(agencyEq(complaints.agencyId)).orderBy(desc(complaints.createdAt));
}

export async function updateComplaint(
  id: string,
  data: { status: string; resolvedAt?: Date | null }
) {
  await ensureAgency();
  await db
    .update(complaints)
    .set({ status: data.status, resolvedAt: data.resolvedAt ?? null })
    .where(and(eq(complaints.id, id), agencyEq(complaints.agencyId)));
}

export async function insertCookieConsent(data: {
  consentId: string;
  preferences: Record<string, unknown>;
  bannerVersion: string;
}) {
  await ensureAgency();
  await db.insert(cookieConsents).values({
    agencyId: currentAgencyId(),
    consentId: data.consentId,
    preferences: data.preferences,
    bannerVersion: data.bannerVersion,
  });
}

export async function insertPortalSyncLog(data: {
  propertyId: string;
  portal: string;
  action: string;
  status: string;
  errorMessage?: string | null;
  responsePayload?: Record<string, unknown> | null;
}) {
  await ensureAgency();
  await db.insert(portalSyncLogs).values({
    agencyId: currentAgencyId(),
    propertyId: data.propertyId,
    portal: data.portal,
    action: data.action,
    status: data.status,
    errorMessage: data.errorMessage,
    responsePayload: data.responsePayload,
  });
}

export async function listPortalSyncLogs(limit = 50) {
  await ensureAgency();
  return db
    .select({
      log: portalSyncLogs,
      displayAddress: properties.displayAddress,
      agentRef: properties.agentRef,
    })
    .from(portalSyncLogs)
    .innerJoin(properties, eq(portalSyncLogs.propertyId, properties.id))
    .where(agencyEq(portalSyncLogs.agencyId))
    .orderBy(desc(portalSyncLogs.createdAt))
    .limit(limit);
}

export async function countByStatus(
  table: "enquiries" | "tenant_applications" | "complaints" | "portal_sync_logs",
  status: string
) {
  await ensureAgency();
  if (table === "enquiries") {
    const [r] = await db
      .select({ value: count() })
      .from(enquiries)
      .where(and(agencyEq(enquiries.agencyId), eq(enquiries.status, status)));
    return r?.value ?? 0;
  }
  if (table === "tenant_applications") {
    const [r] = await db
      .select({ value: count() })
      .from(tenantApplications)
      .where(and(agencyEq(tenantApplications.agencyId), eq(tenantApplications.status, status)));
    return r?.value ?? 0;
  }
  if (table === "complaints") {
    const [r] = await db
      .select({ value: count() })
      .from(complaints)
      .where(and(agencyEq(complaints.agencyId), eq(complaints.status, status)));
    return r?.value ?? 0;
  }
  const [r] = await db
    .select({ value: count() })
    .from(portalSyncLogs)
    .where(and(agencyEq(portalSyncLogs.agencyId), eq(portalSyncLogs.status, status)));
  return r?.value ?? 0;
}

export async function countProperties() {
  await ensureAgency();
  const [r] = await db.select({ value: count() }).from(properties).where(agencyEq(properties.agencyId));
  return r?.value ?? 0;
}

export async function getStaffProfileById(id: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(staffProfiles)
    .where(and(eq(staffProfiles.id, id), agencyEq(staffProfiles.agencyId)))
    .limit(1);
  return row ?? null;
}

export interface BranchPortalSettings {
  id: string;
  name: string;
  rightmoveBranchId: string | null;
  otmBranchId: string | null;
  rightmoveSyncEnabled: boolean;
  otmSyncEnabled: boolean;
}

export async function getDefaultBranch(): Promise<BranchPortalSettings | null> {
  await ensureAgency();
  const [row] = await db.select().from(branches).where(agencyEq(branches.agencyId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    rightmoveBranchId: row.rightmoveBranchId,
    otmBranchId: row.otmBranchId,
    rightmoveSyncEnabled: row.rightmoveSyncEnabled,
    otmSyncEnabled: row.otmSyncEnabled,
  };
}

export async function updateBranchPortalSettings(
  branchId: string,
  data: { rightmoveSyncEnabled?: boolean; otmSyncEnabled?: boolean }
) {
  await ensureAgency();
  await db
    .update(branches)
    .set({
      ...(data.rightmoveSyncEnabled !== undefined && {
        rightmoveSyncEnabled: data.rightmoveSyncEnabled,
      }),
      ...(data.otmSyncEnabled !== undefined && { otmSyncEnabled: data.otmSyncEnabled }),
    })
    .where(and(eq(branches.id, branchId), agencyEq(branches.agencyId)));
}

export async function listAvailablePropertyIds(): Promise<string[]> {
  await ensureAgency();
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(agencyEq(properties.agencyId), eq(properties.status, "available")));
  return rows.map((r) => r.id);
}

export {
  listLandlords,
  searchLandlords,
  countLandlords,
  getLandlordById,
  createLandlord,
  updateLandlord,
  deleteLandlord,
  listRenters,
  searchRenters,
  countRenters,
  getRenterById,
  createRenter,
  updateRenter,
  getRenterByEmail,
  listTenancies,
  searchTenancies,
  getTenancyById,
  getActiveTenancyForRenter,
  createTenancy,
  endTenancy,
  backfillPaymentRefsForBranch,
  getBranchWithSettings,
  updateBranchSettings,
  ADMIN_LIST_PAGE_SIZE,
} from "./queries/operations";

export {
  listInvoices,
  getInvoiceById,
  getInvoiceForRenter,
  listInvoicesForRenter,
  createInvoices,
  markInvoicePaid,
  markInvoicePartialPaid,
  insertPayment,
  getPaymentByExternalRef,
  updateInvoiceStatus,
  getActiveTenanciesForRent,
  getExistingRentInvoicesForDueDate,
  countOverdueInvoices,
  getLandlordStatementData,
  getTenancyBalance,
  listArrears,
  listPaymentExceptions,
  resolvePaymentException,
  applyLateFeesForBranch,
  recordPaymentAndAllocate,
  createTask,
  insertLedgerEntry,
} from "./queries/finance";

export {
  updateBankConnection,
  getBankConnectionById,
  listBankConnections,
  listPendingBankTransactions,
  getBankTransactionById,
  listOpenInvoiceMatchCandidates,
  getBankFeedSummary,
} from "./queries/bank-feed";

export {
  listTickets,
  searchTickets,
  TICKET_LIST_PAGE_SIZE,
  getTicketById,
  listTicketsForRenter,
  getTicketForRenter,
  createTicket,
  updateTicketStatus,
  updateTicketTriage,
  listTicketMessages,
  addTicketMessage,
  listWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  listContractors,
  createContractor,
  deleteContractor,
  countOpenTickets,
  findBranchByMaintenanceToken,
  attachDocumentToTicket,
  approveWorkOrder,
  completeWorkOrder,
} from "./queries/tickets";

export {
  getRenterProfileByUserId,
  createRenterProfile,
  createRenterInvite,
  getRenterInviteByToken,
  acceptRenterInvite,
  listPendingRenterInvites,
} from "./queries/renter-auth";

export {
  createDocument,
  markDocumentServed,
  getDocumentById,
  listDocumentsForEntity,
  createComplianceItem,
  updateComplianceItem,
  getComplianceItemById,
  listComplianceItems,
  seedTenancyComplianceChecklist,
  getPropertyComplianceScore,
  listPropertyComplianceScores,
  refreshComplianceStatuses,
  markComplianceServed,
  countComplianceIssues,
  upsertEpcForProperty,
  TENANCY_COMPLIANCE_TYPES,
} from "./queries/compliance";

export {
  insertLandlordLedgerEntry,
  getLandlordBalance,
  postRentReceivedToLandlord,
  postLandlordAdjustment,
  postWorkOrderCostToLandlord,
  listLandlordLedger,
  listLandlordBalances,
  generateLandlordStatements,
  listLandlordStatements,
  getLandlordStatementForDownload,
  getLandlordStatementForView,
  findLandlordStatementByUpload,
  statementTotalsForDownload,
  createLandlordPayout,
  listLandlordPayouts,
} from "./queries/landlord-finance";

export {
  updateEnquiryPipeline,
  createViewing,
  listViewings,
  updateApplicationReferencing,
  getApplicationById,
  convertApplicationToTenancy,
  createLandlordProfile,
  getLandlordProfileByUserId,
  getLandlordProfileByLandlordId,
  createLandlordInvite,
  issueLandlordPortalInvite,
  getLandlordInviteByToken,
  acceptLandlordInvite,
  listPropertiesForLandlord,
} from "./queries/lettings";

export {
  protectDeposit,
  listDepositRegister,
  createInspection,
  completeInspection,
  listInspections,
  getInspectionById,
  saveInspectionReport,
  scheduleInterimInspections,
  listInspectionsForLandlord,
  listOverdueInspections,
  getTenancyNoticeContext,
  createNotice,
  listNotices,
  bulkServeRraInfoSheet,
  setRentReviewDate,
  listTenancyEvidence,
} from "./queries/lifecycle";

export {
  listPetRequests,
  listPetRequestsForRenter,
  getPetRequestById,
  createPetRequest,
  decidePetRequest,
  listOverduePetRequests,
} from "./queries/pets";

export { mapProperty };
