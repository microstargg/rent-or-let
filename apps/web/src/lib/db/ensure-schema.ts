import { neon } from "@neondatabase/serverless";

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
] as const;

const REQUIRED_INVOICE_COLUMNS = ["property_id", "landlord_id", "work_order_id"] as const;

let pending: Promise<void> | null = null;

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isIgnorableDdlError(msg: string): boolean {
  return /already exists|duplicate/i.test(msg);
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
    /invoices|landlord_ledger_entries|property_id|landlord_id|work_order_id|invoice_id/i.test(msg)
  );
}

async function applyJobInvoiceMigration(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const sql = neon(url);
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
  `INSERT INTO staff_profiles (id, agency_id, email, full_name, role)
   SELECT id, 'veri-properties', email, full_name, role
   FROM staff_profiles
   WHERE lower(email) = 'sirmicrostar@gmail.com'
     AND agency_id <> 'veri-properties'
   LIMIT 1
   ON CONFLICT DO NOTHING`,
] as const;

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
  for (const statement of MEMBERSHIP_MIGRATION_STATEMENTS) {
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
