import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  rightmoveBranchId: text("rightmove_branch_id"),
  otmBranchId: text("otm_branch_id"),
  rightmoveSyncEnabled: boolean("rightmove_sync_enabled").notNull().default(false),
  otmSyncEnabled: boolean("otm_sync_enabled").notNull().default(false),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffProfiles = pgTable("staff_profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landlords = pgTable(
  "landlords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    bankDetails: jsonb("bank_details"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_landlords_branch").on(table.branchId)]
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "set null" }),
    isVacant: boolean("is_vacant").notNull().default(true),
    boilerModel: text("boiler_model"),
    boilerInstallDate: date("boiler_install_date"),
    metadata: jsonb("metadata").notNull().default({}),
    agentRef: text("agent_ref").notNull(),
    slug: text("slug").notNull().unique(),
    displayAddress: text("display_address").notNull(),
    houseNameNumber: text("house_name_number").notNull().default(""),
    street: text("street").notNull(),
    town: text("town").notNull(),
    postcode: text("postcode").notNull(),
    pricePcm: numeric("price_pcm", { precision: 10, scale: 2 }).notNull(),
    deposit: numeric("deposit", { precision: 10, scale: 2 }).notNull(),
    holdingDeposit: numeric("holding_deposit", { precision: 10, scale: 2 }),
    availableFrom: date("available_from").notNull(),
    bedrooms: integer("bedrooms").notNull(),
    bathrooms: integer("bathrooms").notNull().default(1),
    propertyType: text("property_type").notNull(),
    furnished: text("furnished").notNull().default("unfurnished"),
    status: text("status").notNull().default("draft"),
    description: text("description").notNull(),
    summary: text("summary"),
    features: jsonb("features").notNull().default([]),
    permittedPayments: jsonb("permitted_payments").default([]),
    epcRating: text("epc_rating"),
    virtualTourUrl: text("virtual_tour_url"),
    floorplanUrl: text("floorplan_url"),
    epcUrl: text("epc_url"),
    portalSync: jsonb("portal_sync").notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("properties_branch_agent_ref").on(table.branchId, table.agentRef),
    index("idx_properties_status").on(table.status),
    index("idx_properties_postcode").on(table.postcode),
  ]
);

export const propertyImages = pgTable(
  "property_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_property_images_property").on(table.propertyId)]
);

export const siteContent = pgTable("site_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title"),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const enquiries = pgTable("enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  source: text("source").notNull().default("website"),
  status: text("status").notNull().default("new"),
  pipelineStage: text("pipeline_stage").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantApplications = pgTable("tenant_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  status: text("status").notNull().default("submitted"),
  referencingStatus: text("referencing_status").notNull().default("pending"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  employmentStatus: text("employment_status").notNull(),
  annualIncome: numeric("annual_income", { precision: 12, scale: 2 }),
  currentAddress: text("current_address").notNull(),
  moveInDate: date("move_in_date"),
  occupants: integer("occupants").notNull().default(1),
  pets: boolean("pets").notNull().default(false),
  petsDetails: text("pets_details"),
  referenceData: jsonb("reference_data").notNull().default({}),
  additionalInfo: text("additional_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  tenantName: text("tenant_name").notNull(),
  tenantEmail: text("tenant_email").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  source: text("source").notNull().default("website"),
  slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalSyncLogs = pgTable(
  "portal_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    portal: text("portal").notNull(),
    action: text("action").notNull(),
    status: text("status").notNull(),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_portal_sync_logs_property").on(table.propertyId)]
);

export const portalSyncJobs = pgTable(
  "portal_sync_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    portal: text("portal").notNull(),
    action: text("action").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_portal_sync_jobs_pending").on(table.status, table.scheduledAt)]
);

export const cookieConsents = pgTable("cookie_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  consentId: text("consent_id").notNull(),
  preferences: jsonb("preferences").notNull(),
  bannerVersion: text("banner_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const renters = pgTable(
  "renters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    employmentInfo: jsonb("employment_info"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_renters_branch").on(table.branchId)]
);

export const tenancies = pgTable(
  "tenancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    primaryRenterId: uuid("primary_renter_id")
      .notNull()
      .references(() => renters.id, { onDelete: "restrict" }),
    rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
    rentFrequency: text("rent_frequency").notNull().default("monthly"),
    depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: text("status").notNull().default("active"),
    depositScheme: text("deposit_scheme"),
    depositProtectedAt: date("deposit_protected_at"),
    depositProtectionRef: text("deposit_protection_ref"),
    rentReviewDate: date("rent_review_date"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tenancies_branch").on(table.branchId),
    index("idx_tenancies_property").on(table.propertyId),
    index("idx_tenancies_status").on(table.status),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "set null" }),
    workOrderId: uuid("work_order_id"),
    type: text("type").notNull(),
    dueDate: date("due_date").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("due"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_invoices_branch_due").on(table.branchId, table.dueDate),
    index("idx_invoices_tenancy").on(table.tenancyId),
    index("idx_invoices_property").on(table.propertyId),
    index("idx_invoices_landlord").on(table.landlordId),
    uniqueIndex("invoices_work_order")
      .on(table.workOrderId)
      .where(sql`${table.workOrderId} is not null`),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    method: text("method").notNull().default("bank_transfer"),
    externalRef: text("external_ref"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_payments_branch").on(table.branchId),
    uniqueIndex("payments_branch_external_ref").on(table.branchId, table.externalRef),
  ]
);

export const contractors = pgTable(
  "contractors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    trade: text("trade"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_contractors_branch").on(table.branchId)]
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    reportedByType: text("reported_by_type").notNull(),
    reportedById: uuid("reported_by_id"),
    source: text("source").notNull().default("staff"),
    category: text("category"),
    priority: text("priority"),
    status: text("status").notNull().default("new"),
    summary: text("summary").notNull(),
    description: text("description"),
    locationArea: text("location_area"),
    isEmergency: boolean("is_emergency").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_tickets_branch_status").on(table.branchId, table.status),
    index("idx_tickets_property").on(table.propertyId),
  ]
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    senderType: text("sender_type").notNull(),
    senderId: uuid("sender_id"),
    channel: text("channel").notNull().default("portal"),
    body: text("body").notNull(),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_ticket_messages_ticket").on(table.ticketId)]
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id").references(() => contractors.id, { onDelete: "set null" }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    costEstimate: numeric("cost_estimate", { precision: 12, scale: 2 }),
    finalCost: numeric("final_cost", { precision: 12, scale: 2 }),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_work_orders_ticket").on(table.ticketId)]
);

export const renterProfiles = pgTable(
  "renter_profiles",
  {
    id: text("id").primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => renters.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("renter_profiles_renter").on(table.renterId),
    index("idx_renter_profiles_branch").on(table.branchId),
  ]
);

export const renterInvites = pgTable(
  "renter_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => renters.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_renter_invites_token").on(table.token)]
);

/** Phase A: tenancy ledger — charges positive, payments negative */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "set null" }),
    entryType: text("entry_type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    memo: text("memo"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ledger_entries_tenancy").on(table.tenancyId),
    index("idx_ledger_entries_branch").on(table.branchId),
  ]
);

export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_payment_allocations_payment").on(table.paymentId),
    index("idx_payment_allocations_invoice").on(table.invoiceId),
  ]
);

export const paymentExceptions = pgTable(
  "payment_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("open"),
    note: text("note"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_payment_exceptions_branch_status").on(table.branchId, table.status),
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    relatedType: text("related_type"),
    relatedId: uuid("related_id"),
    assigneeStaffId: text("assignee_staff_id"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_tasks_branch_status").on(table.branchId, table.status)]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    kind: text("kind").notNull(),
    url: text("url").notNull(),
    filename: text("filename"),
    servedAt: timestamp("served_at", { withTimezone: true }),
    servedTo: text("served_to"),
    servedChannel: text("served_channel"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_documents_entity").on(table.entityType, table.entityId),
    index("idx_documents_branch").on(table.branchId),
  ]
);

export const complianceItems = pgTable(
  "compliance_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("missing"),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    reference: text("reference"),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_compliance_property").on(table.propertyId),
    index("idx_compliance_branch_status").on(table.branchId, table.status),
  ]
);

/** Phase C: landlord client money ledger — credits positive (due to landlord), debits negative */
export const landlordLedgerEntries = pgTable(
  "landlord_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id")
      .notNull()
      .references(() => landlords.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    entryType: text("entry_type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    workOrderId: uuid("work_order_id"),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    statementId: uuid("statement_id"),
    memo: text("memo"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_landlord_ledger_landlord").on(table.landlordId),
    index("idx_landlord_ledger_branch").on(table.branchId),
  ]
);

export const landlordStatements = pgTable(
  "landlord_statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id")
      .notNull()
      .references(() => landlords.id, { onDelete: "cascade" }),
    periodFrom: date("period_from").notNull(),
    periodTo: date("period_to").notNull(),
    totals: jsonb("totals").notNull().default({}),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_landlord_statements_landlord").on(table.landlordId)]
);

export const landlordPayouts = pgTable(
  "landlord_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id")
      .notNull()
      .references(() => landlords.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    method: text("method").notNull().default("bank_transfer"),
    externalRef: text("external_ref"),
    statementIds: jsonb("statement_ids").notNull().default([]),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_landlord_payouts_landlord").on(table.landlordId)]
);

export const viewings = pgTable(
  "viewings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    enquiryId: uuid("enquiry_id").references(() => enquiries.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    outcome: text("outcome"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_viewings_property").on(table.propertyId)]
);

export const landlordProfiles = pgTable(
  "landlord_profiles",
  {
    id: text("id").primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id")
      .notNull()
      .references(() => landlords.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("landlord_profiles_landlord").on(table.landlordId),
    index("idx_landlord_profiles_branch").on(table.branchId),
  ]
);

export const landlordInvites = pgTable(
  "landlord_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    landlordId: uuid("landlord_id")
      .notNull()
      .references(() => landlords.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_landlord_invites_token").on(table.token)]
);

export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    summary: text("summary"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_inspections_property").on(table.propertyId)]
);

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    tenancyId: uuid("tenancy_id")
      .notNull()
      .references(() => tenancies.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    servedAt: timestamp("served_at", { withTimezone: true }),
    effectiveAt: date("effective_at"),
    grounds: text("grounds"),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_notices_tenancy").on(table.tenancyId)]
);

/** Statement import connections (CSV) and historical bank links */
export const bankConnections = pgTable(
  "bank_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    provider: text("provider").notNull().default("csv"),
    status: text("status").notNull().default("pending"),
    providerUserId: text("provider_user_id"),
    accountId: text("account_id"),
    accountName: text("account_name"),
    accountNumberMask: text("account_number_mask"),
    sortCodeMask: text("sort_code_mask"),
    consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_bank_connections_branch").on(table.branchId),
    index("idx_bank_connections_branch_status").on(table.branchId, table.status),
  ]
);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => bankConnections.id, { onDelete: "cascade" }),
    providerTxnId: text("provider_txn_id").notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("GBP"),
    description: text("description"),
    counterparty: text("counterparty"),
    matchStatus: text("match_status").notNull().default("pending"),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    tenancyId: uuid("tenancy_id").references(() => tenancies.id, { onDelete: "set null" }),
    exceptionId: uuid("exception_id").references(() => paymentExceptions.id, {
      onDelete: "set null",
    }),
    raw: jsonb("raw").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bank_transactions_branch_provider_txn").on(
      table.branchId,
      table.providerTxnId
    ),
    index("idx_bank_transactions_connection").on(table.connectionId),
    index("idx_bank_transactions_match_status").on(table.branchId, table.matchStatus),
  ]
);
