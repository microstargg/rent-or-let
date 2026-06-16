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

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  rightmoveBranchId: text("rightmove_branch_id"),
  otmBranchId: text("otm_branch_id"),
  rightmoveSyncEnabled: boolean("rightmove_sync_enabled").notNull().default(false),
  otmSyncEnabled: boolean("otm_sync_enabled").notNull().default(false),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffProfiles = pgTable("staff_profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantApplications = pgTable("tenant_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
  status: text("status").notNull().default("submitted"),
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
