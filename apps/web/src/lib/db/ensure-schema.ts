import { neon } from "@neondatabase/serverless";
import { getAgencyOrNull, ISOLATED_AGENCY_SLUGS, type Agency } from "@repo/config/server";

/**
 * Idempotent statements from drizzle/0010_job_invoices.sql.
 * Applied at runtime so production does not 500 after deploy if db:push was skipped.
 */
export const JOB_INVOICE_MIGRATION_STATEMENTS = [
  `ALTER TABLE invoices ALTER COLUMN tenancy_id DROP NOT NULL`,
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL`,
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES landlords(id) ON DELETE SET NULL`,
  `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS invoices_work_order ON invoices(work_order_id) WHERE work_order_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_property ON invoices(property_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_landlord ON invoices(landlord_id)`,
  `ALTER TABLE landlord_ledger_entries ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL`,
  // drizzle/0014_month_end.sql
  `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS client_charge numeric(12, 2)`,
] as const;

const REQUIRED_INVOICE_COLUMNS = ["property_id", "landlord_id", "work_order_id"] as const;

let pending: Promise<void> | null = null;

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isIgnorableDdlError(msg: string): boolean {
  return /already exists|duplicate/i.test(msg);
}

type NeonSql = ReturnType<typeof neon<false, false>>;

const hasCol = (table: string, column: string) =>
  `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}')`;
const hasRel = (name: string) => `to_regclass('public.${name}') IS NOT NULL`;

/**
 * One cheap round trip that says whether a migration group has already been applied.
 * The DDL below used to run on every cold start (10+ sequential round trips, and some
 * statements take table locks), which made the first page load after a deploy or idle slow.
 */
async function alreadyApplied(sql: NeonSql, checks: string[]): Promise<boolean> {
  try {
    const rows = (await sql(`SELECT (${checks.join(" AND ")}) AS ok`)) as { ok: boolean }[];
    return rows[0]?.ok === true;
  } catch {
    return false;
  }
}

export function isMissingInvoiceColumnError(err: unknown): boolean {
  const chunks = [messageOf(err)];
  let current: unknown = err;
  for (let i = 0; i < 3 && current && typeof current === "object"; i++) {
    const o = current as { code?: unknown; cause?: unknown; detail?: unknown };
    if (o.code === "42703") return true;
    if (o.detail) chunks.push(String(o.detail));
    current = o.cause;
    if (current) chunks.push(messageOf(current));
  }
  const msg = chunks.join(" ");
  return (
    /does not exist/i.test(msg) &&
    /invoices|landlord_ledger_entries|property_id|landlord_id|work_order_id|invoice_id|client_charge|landlord_payout_id/i.test(msg)
  );
}

async function applyJobInvoiceMigration(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const sql = neon(url);
  if (
    await alreadyApplied(sql, [
      `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'tenancy_id' AND is_nullable = 'YES')`,
      hasCol("invoices", "property_id"),
      hasCol("invoices", "landlord_id"),
      hasCol("invoices", "work_order_id"),
      hasRel("invoices_work_order"),
      hasRel("idx_invoices_property"),
      hasRel("idx_invoices_landlord"),
      hasCol("landlord_ledger_entries", "invoice_id"),
      hasCol("work_orders", "client_charge"),
    ])
  ) {
    return;
  }
  const errors: string[] = [];

  for (const statement of JOB_INVOICE_MIGRATION_STATEMENTS) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = messageOf(err);
      if (isIgnorableDdlError(msg)) continue;
      errors.push(`${statement.slice(0, 72)}… ${msg}`);
    }
  }

  // work_order_id FK fails if work_orders is missing; still add the bare column
  // so SELECT invoice.* from drizzle does not 500 the invoices page.
  let invoiceCols: Set<string>;
  try {
    const rows = (await sql(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      ["invoices"]
    )) as { column_name: string }[];
    invoiceCols = new Set(rows.map((r) => r.column_name));
  } catch (err) {
    if (errors.length === 0) return;
    throw new Error(
      `Could not verify invoices schema (${messageOf(err)}). ${errors.join("; ")}`
    );
  }
  for (const col of REQUIRED_INVOICE_COLUMNS) {
    if (invoiceCols.has(col)) continue;
    try {
      await sql(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col} uuid`);
      invoiceCols.add(col);
    } catch (err) {
      errors.push(`add ${col}: ${messageOf(err)}`);
    }
  }

  const missing = REQUIRED_INVOICE_COLUMNS.filter((col) => !invoiceCols.has(col));
  if (missing.length) {
    throw new Error(
      `Invoices schema is missing ${missing.join(", ")}. ${errors.join("; ") || "Check DATABASE_URL and apply drizzle/0010_job_invoices.sql."}`
    );
  }
}

export async function ensureJobInvoiceSchema(opts?: { force?: boolean }): Promise<void> {
  if (opts?.force) pending = null;
  if (!pending) {
    pending = applyJobInvoiceMigration().catch((err) => {
      pending = null;
      throw err;
    });
  }
  await pending;
}

const PET_REQUEST_DDL = `
CREATE TABLE IF NOT EXISTS pet_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  tenancy_id uuid NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  renter_id uuid REFERENCES renters(id) ON DELETE SET NULL,
  pet_description text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  decision_at timestamptz,
  decision_notes text,
  info_requested_at timestamptz,
  superior_requested_at timestamptz,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`.replace(/\s+/g, " ").trim();

let petPending: Promise<void> | null = null;

async function applyPetRequestMigration(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = neon(url);
  if (
    await alreadyApplied(sql, [
      hasRel("pet_requests"),
      hasRel("idx_pet_requests_tenancy"),
      hasRel("idx_pet_requests_branch_status"),
    ])
  ) {
    return;
  }
  try {
    await sql(PET_REQUEST_DDL);
    await sql(`CREATE INDEX IF NOT EXISTS idx_pet_requests_tenancy ON pet_requests(tenancy_id)`);
    await sql(
      `CREATE INDEX IF NOT EXISTS idx_pet_requests_branch_status ON pet_requests(branch_id, status)`
    );
  } catch (err) {
    const msg = messageOf(err);
    if (!isIgnorableDdlError(msg) && !/does not exist/i.test(msg)) {
      console.warn("pet_requests migration:", msg);
    }
  }
}

export async function ensurePetRequestsSchema(): Promise<void> {
  if (!petPending) {
    petPending = applyPetRequestMigration().catch((err) => {
      petPending = null;
      throw err;
    });
  }
  await petPending;
}

const MEMBERSHIP_MIGRATION_STATEMENTS = [
  `ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_pkey`,
  `ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (agency_id, id)`,
  `ALTER TABLE renter_profiles DROP CONSTRAINT IF EXISTS renter_profiles_pkey`,
  `ALTER TABLE renter_profiles ADD CONSTRAINT renter_profiles_pkey PRIMARY KEY (agency_id, id)`,
  `ALTER TABLE landlord_profiles DROP CONSTRAINT IF EXISTS landlord_profiles_pkey`,
  `ALTER TABLE landlord_profiles ADD CONSTRAINT landlord_profiles_pkey PRIMARY KEY (agency_id, id)`,
  `CREATE TABLE IF NOT EXISTS staff_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id TEXT NOT NULL REFERENCES agencies(slug),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS staff_invites_agency_email ON staff_invites (agency_id, email)`,
] as const;

/** Keeps the owner's staff row on veri-properties. Cheap, so it still runs once per server. */
const OWNER_VERI_MEMBERSHIP = `INSERT INTO staff_profiles (id, agency_id, email, full_name, role)
   SELECT id, 'veri-properties', email, full_name, role
   FROM staff_profiles
   WHERE lower(email) = 'sirmicrostar@gmail.com'
     AND agency_id <> 'veri-properties'
   LIMIT 1
   ON CONFLICT DO NOTHING`;

/** Each profile table's primary key is (agency_id, id). */
const compositeProfileKeys = `(SELECT count(*) FROM pg_constraint WHERE contype = 'p' AND array_length(conkey, 1) = 2 AND conrelid IN (to_regclass('public.staff_profiles'), to_regclass('public.renter_profiles'), to_regclass('public.landlord_profiles'))) = 3`;

let membershipPending: Promise<void> | null = null;

function isIgnorableMembershipError(msg: string): boolean {
  return (
    isIgnorableDdlError(msg) ||
    /multiple primary keys/i.test(msg) ||
    /already exists/i.test(msg)
  );
}

async function applyAgencyMembershipMigration(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = neon(url);
  // Without this check every cold start dropped and rebuilt three primary keys,
  // locking the profile tables (and so sign-in) while it ran.
  const applied = await alreadyApplied(sql, [
    compositeProfileKeys,
    hasRel("staff_invites"),
    hasRel("staff_invites_agency_email"),
  ]);
  const statements: readonly string[] = applied
    ? [OWNER_VERI_MEMBERSHIP]
    : [...MEMBERSHIP_MIGRATION_STATEMENTS, OWNER_VERI_MEMBERSHIP];
  for (const statement of statements) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = messageOf(err);
      if (isIgnorableMembershipError(msg)) continue;
      console.warn("agency membership migration:", msg);
    }
  }
}

/** Same Google user on multiple agencies: PK (agency_id, auth user id) plus staff invites. */
export async function ensureAgencyMembershipSchema(): Promise<void> {
  if (!membershipPending) {
    membershipPending = applyAgencyMembershipMigration().catch((err) => {
      membershipPending = null;
      throw err;
    });
  }
  await membershipPending;
}

/** Idempotent statements from drizzle/0014_property_statements.sql. */
export const PROPERTY_STATEMENT_MIGRATION_STATEMENTS = [
  `ALTER TABLE landlord_statements ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL`,
  `ALTER TABLE landlord_statements ADD COLUMN IF NOT EXISTS parent_statement_id uuid REFERENCES landlord_statements(id) ON DELETE CASCADE`,
  `CREATE INDEX IF NOT EXISTS idx_landlord_statements_parent ON landlord_statements(parent_statement_id)`,
] as const;

let propertyStatementPending: Promise<void> | null = null;

async function applyPropertyStatementMigration(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = neon(url);
  if (
    await alreadyApplied(sql, [
      hasCol("landlord_statements", "property_id"),
      hasCol("landlord_statements", "parent_statement_id"),
      hasRel("idx_landlord_statements_parent"),
    ])
  ) {
    return;
  }
  for (const statement of PROPERTY_STATEMENT_MIGRATION_STATEMENTS) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = messageOf(err);
      if (isIgnorableDdlError(msg)) continue;
      console.warn("property statements migration:", msg);
    }
  }
}

/** Per-property landlord statements: property_id + parent_statement_id on landlord_statements. */
export async function ensurePropertyStatementSchema(): Promise<void> {
  if (!propertyStatementPending) {
    propertyStatementPending = applyPropertyStatementMigration().catch((err) => {
      propertyStatementPending = null;
      throw err;
    });
  }
  await propertyStatementPending;
}

/**
 * Idempotent statements from drizzle/0009_bank_feed.sql (plus the agency_id column from
 * 0012). Production was set up without them, so a bank statement import failed with
 * "relation bank_transactions does not exist".
 */
export const BANK_FEED_MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid NOT NULL REFERENCES branches(id),
  provider text NOT NULL DEFAULT 'truelayer',
  status text NOT NULL DEFAULT 'pending',
  provider_user_id text,
  account_id text,
  account_name text,
  account_number_mask text,
  sort_code_mask text,
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  access_token_enc text,
  refresh_token_enc text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_connections_branch ON bank_connections(branch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_connections_branch_status ON bank_connections(branch_id, status)`,
  `CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid NOT NULL REFERENCES branches(id),
  connection_id uuid NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  provider_txn_id text NOT NULL,
  booked_at timestamptz NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  description text,
  counterparty text,
  match_status text NOT NULL DEFAULT 'pending',
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  exception_id uuid REFERENCES payment_exceptions(id) ON DELETE SET NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_branch_provider_txn ON bank_transactions(branch_id, provider_txn_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_transactions_connection ON bank_transactions(connection_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_status ON bank_transactions(branch_id, match_status)`,
  // drizzle/0014_month_end.sql: outgoing lines link to the payout or contractor job they paid
  `ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS landlord_payout_id uuid REFERENCES landlord_payouts(id) ON DELETE SET NULL`,
  `ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_bank_transactions_payout ON bank_transactions(landlord_payout_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bank_transactions_work_order ON bank_transactions(work_order_id)`,
] as const;

let bankFeedPending: Promise<void> | null = null;

async function applyBankFeedMigration(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = neon(url);
  if (
    await alreadyApplied(sql, [
      hasRel("bank_connections"),
      hasRel("idx_bank_connections_branch"),
      hasRel("idx_bank_connections_branch_status"),
      hasRel("bank_transactions"),
      hasRel("bank_transactions_branch_provider_txn"),
      hasRel("idx_bank_transactions_connection"),
      hasRel("idx_bank_transactions_match_status"),
      hasCol("bank_transactions", "landlord_payout_id"),
      hasCol("bank_transactions", "work_order_id"),
      hasRel("idx_bank_transactions_payout"),
      hasRel("idx_bank_transactions_work_order"),
    ])
  ) {
    return;
  }
  for (const statement of BANK_FEED_MIGRATION_STATEMENTS) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = messageOf(err);
      if (isIgnorableDdlError(msg)) continue;
      throw new Error(`Bank feed schema: ${msg}`);
    }
  }
}

/** bank_connections + bank_transactions, used by the bank statement import. */
export async function ensureBankFeedSchema(): Promise<void> {
  if (!bankFeedPending) {
    bankFeedPending = applyBankFeedMigration().catch((err) => {
      bankFeedPending = null;
      throw err;
    });
  }
  await bankFeedPending;
}

/** Statements from drizzle/0015_notifications.sql, split for neon's one-statement calls. */
export const NOTIFICATIONS_MIGRATION_STATEMENTS = [
  `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assignee_staff_id text`,
  `CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(assignee_staff_id)`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_staff_id)`,
  `ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb`,
  `CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  staff_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  dedupe_key text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_staff ON notifications(agency_id, staff_id, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe ON notifications(agency_id, staff_id, dedupe_key)`,
] as const;

const notificationsPending = new Map<string, Promise<void>>();

async function applyNotificationsMigration(url: string): Promise<void> {
  const sql = neon(url);
  // One cheap round trip on a warm database: skip the DDL when it has already run.
  try {
    const rows = (await sql(
      `SELECT
         to_regclass('public.notifications') IS NOT NULL AS has_table,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'work_orders' AND column_name = 'assignee_staff_id') AS has_assignee,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_profiles' AND column_name = 'notification_prefs') AS has_prefs,
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'completed_at') AS has_task_cols`
    )) as { has_table: boolean; has_assignee: boolean; has_prefs: boolean; has_task_cols: boolean }[];
    const r = rows[0];
    if (r?.has_table && r.has_assignee && r.has_prefs && r.has_task_cols) return;
  } catch {
    // Fall through and try the statements.
  }
  for (const statement of NOTIFICATIONS_MIGRATION_STATEMENTS) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = messageOf(err);
      if (isIgnorableDdlError(msg)) continue;
      throw new Error(`Notifications schema: ${msg}`);
    }
  }
}

/** Same as ensureNotificationsSchema, for a database URL known up front (demo reset). */
export async function ensureNotificationsSchemaForUrl(url: string): Promise<void> {
  let pendingForUrl = notificationsPending.get(url);
  if (!pendingForUrl) {
    pendingForUrl = applyNotificationsMigration(url).catch((err) => {
      notificationsPending.delete(url);
      throw err;
    });
    notificationsPending.set(url, pendingForUrl);
  }
  await pendingForUrl;
}

/**
 * Job assignees, task notes and the notifications table. Runs against the current
 * agency's own database (the demo has its own), once per database per server.
 */
export async function ensureNotificationsSchema(forAgency?: Agency): Promise<void> {
  const agency = forAgency ?? getAgencyOrNull();
  const url = agency
    ? agency.runtime.databaseUrl ||
      (ISOLATED_AGENCY_SLUGS.has(agency.slug) ? undefined : process.env.DATABASE_URL)
    : process.env.DATABASE_URL;
  if (!url) return;
  await ensureNotificationsSchemaForUrl(url);
}
