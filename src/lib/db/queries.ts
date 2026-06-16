import { eq, and, gte, lte, ilike, desc, asc, sql, count } from "drizzle-orm";
import { db } from "./index";
import {
  properties,
  propertyImages,
  branches,
  staffProfiles,
  enquiries,
  tenantApplications,
  complaints,
  portalSyncLogs,
  portalSyncJobs,
  cookieConsents,
} from "./schema";
import type { Property, PropertyImage, PortalName } from "@/types";

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
  const conditions = [eq(properties.status, "available")];
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
  const [row] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.slug, slug), eq(properties.status, "available")))
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
  const [row] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!row) return null;

  const images = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, id))
    .orderBy(asc(propertyImages.sortOrder));

  return mapProperty(row, images.map(mapImage));
}

export async function listAllProperties() {
  return db.select().from(properties).orderBy(desc(properties.updatedAt));
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
}) {
  const [row] = await db
    .insert(properties)
    .values({
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
  }>
) {
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
      updatedAt: new Date(),
    })
    .where(eq(properties.id, id));
}

export async function getPropertyWithBranch(id: string) {
  const [row] = await db
    .select({ property: properties, branch: branches })
    .from(properties)
    .innerJoin(branches, eq(properties.branchId, branches.id))
    .where(eq(properties.id, id))
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
  };
}

export async function addPropertyImage(data: {
  propertyId: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}) {
  await db.insert(propertyImages).values({
    propertyId: data.propertyId,
    url: data.url,
    sortOrder: data.sortOrder,
    isPrimary: data.isPrimary,
  });
}

export async function countPropertyImages(propertyId: string) {
  const [result] = await db
    .select({ value: count() })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, propertyId));
  return result?.value ?? 0;
}

export async function getPropertyImage(imageId: string) {
  const [row] = await db
    .select()
    .from(propertyImages)
    .where(eq(propertyImages.id, imageId))
    .limit(1);
  return row ?? null;
}

export async function deletePropertyImage(imageId: string) {
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
  await db.insert(enquiries).values({
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
  return db
    .select({
      enquiry: enquiries,
      displayAddress: properties.displayAddress,
    })
    .from(enquiries)
    .leftJoin(properties, eq(enquiries.propertyId, properties.id))
    .orderBy(desc(enquiries.createdAt));
}

export async function updateEnquiryStatus(id: string, status: string) {
  await db.update(enquiries).set({ status }).where(eq(enquiries.id, id));
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
  await db.insert(tenantApplications).values({
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
  return db
    .select({
      application: tenantApplications,
      displayAddress: properties.displayAddress,
    })
    .from(tenantApplications)
    .leftJoin(properties, eq(tenantApplications.propertyId, properties.id))
    .orderBy(desc(tenantApplications.createdAt));
}

export async function updateApplicationStatus(id: string, status: string) {
  await db.update(tenantApplications).set({ status }).where(eq(tenantApplications.id, id));
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
  await db.insert(complaints).values({
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
  return db.select().from(complaints).orderBy(desc(complaints.createdAt));
}

export async function updateComplaint(
  id: string,
  data: { status: string; resolvedAt?: Date | null }
) {
  await db
    .update(complaints)
    .set({ status: data.status, resolvedAt: data.resolvedAt ?? null })
    .where(eq(complaints.id, id));
}

export async function insertCookieConsent(data: {
  consentId: string;
  preferences: Record<string, unknown>;
  bannerVersion: string;
}) {
  await db.insert(cookieConsents).values({
    consentId: data.consentId,
    preferences: data.preferences,
    bannerVersion: data.bannerVersion,
  });
}

export async function enqueuePortalSyncJob(
  propertyId: string,
  portal: PortalName,
  action: "send" | "remove"
) {
  await db.insert(portalSyncJobs).values({ propertyId, portal, action, status: "pending" });
}

export async function getPendingSyncJobs(limit = 20) {
  return db
    .select()
    .from(portalSyncJobs)
    .where(eq(portalSyncJobs.status, "pending"))
    .orderBy(asc(portalSyncJobs.scheduledAt))
    .limit(limit);
}

export async function updateSyncJob(
  id: string,
  data: { status: string; attempts: number; processedAt?: Date }
) {
  await db
    .update(portalSyncJobs)
    .set({
      status: data.status,
      attempts: data.attempts,
      processedAt: data.processedAt,
    })
    .where(eq(portalSyncJobs.id, id));
}

export async function insertPortalSyncLog(data: {
  propertyId: string;
  portal: string;
  action: string;
  status: string;
  errorMessage?: string | null;
  responsePayload?: Record<string, unknown> | null;
}) {
  await db.insert(portalSyncLogs).values({
    propertyId: data.propertyId,
    portal: data.portal,
    action: data.action,
    status: data.status,
    errorMessage: data.errorMessage,
    responsePayload: data.responsePayload,
  });
}

export async function listPortalSyncLogs(limit = 50) {
  return db
    .select({
      log: portalSyncLogs,
      displayAddress: properties.displayAddress,
      agentRef: properties.agentRef,
    })
    .from(portalSyncLogs)
    .innerJoin(properties, eq(portalSyncLogs.propertyId, properties.id))
    .orderBy(desc(portalSyncLogs.createdAt))
    .limit(limit);
}

export async function countPendingSyncJobs() {
  const [result] = await db
    .select({ value: count() })
    .from(portalSyncJobs)
    .where(eq(portalSyncJobs.status, "pending"));
  return result?.value ?? 0;
}

export async function countByStatus(
  table: "enquiries" | "tenant_applications" | "complaints" | "portal_sync_logs",
  status: string
) {
  if (table === "enquiries") {
    const [r] = await db.select({ value: count() }).from(enquiries).where(eq(enquiries.status, status));
    return r?.value ?? 0;
  }
  if (table === "tenant_applications") {
    const [r] = await db
      .select({ value: count() })
      .from(tenantApplications)
      .where(eq(tenantApplications.status, status));
    return r?.value ?? 0;
  }
  if (table === "complaints") {
    const [r] = await db.select({ value: count() }).from(complaints).where(eq(complaints.status, status));
    return r?.value ?? 0;
  }
  const [r] = await db
    .select({ value: count() })
    .from(portalSyncLogs)
    .where(eq(portalSyncLogs.status, status));
  return r?.value ?? 0;
}

export async function countProperties() {
  const [r] = await db.select({ value: count() }).from(properties);
  return r?.value ?? 0;
}

export async function getStaffProfileById(id: string) {
  const [row] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.id, id))
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
  const [row] = await db.select().from(branches).limit(1);
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
  await db
    .update(branches)
    .set({
      ...(data.rightmoveSyncEnabled !== undefined && {
        rightmoveSyncEnabled: data.rightmoveSyncEnabled,
      }),
      ...(data.otmSyncEnabled !== undefined && { otmSyncEnabled: data.otmSyncEnabled }),
    })
    .where(eq(branches.id, branchId));
}

export async function listAvailablePropertyIds(): Promise<string[]> {
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.status, "available"));
  return rows.map((r) => r.id);
}

export { mapProperty };
