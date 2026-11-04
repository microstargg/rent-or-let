import { neon } from "@neondatabase/serverless";
import { getAgencyOrNull, ISOLATED_AGENCY_SLUGS, type Agency } from "@repo/config/server";

/**
 * Runtime migrations for feature columns and tables, applied per agency database
 * (the demo has its own) the first time a server touches it. Each group has a
 * cheap probe so a warm database costs one round trip.
 *
 * Keep in step with packages/database/drizzle/0016+ files.
 */
interface FeatureMigration {
  name: string;
  /** SELECT that returns one row with `ok` = true when the group is already applied. */
  probe: string;
  statements: readonly string[];
}

const col = (table: string, column: string) =>
  `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}')`;

export const FEATURE_MIGRATIONS: FeatureMigration[] = [
  {
    // drizzle/0016_tenancy_essentials.sql
    name: "tenancy_essentials",
    probe: `SELECT (to_regclass('public.agreement_signatures') IS NOT NULL AND ${col("landlords", "prs_registration_number")} AND ${col("tenant_applications", "holding_deposit_amount")}) AS ok`,
    statements: [
      `CREATE TABLE IF NOT EXISTS tenancy_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid NOT NULL REFERENCES branches(id),
  tenancy_id uuid NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  role text NOT NULL,
  renter_id uuid REFERENCES renters(id) ON DELETE CASCADE,
  guarantees_renter_id uuid REFERENCES renters(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
)`,
      `CREATE INDEX IF NOT EXISTS idx_tenancy_parties_tenancy ON tenancy_parties(tenancy_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS tenancy_parties_tenant ON tenancy_parties(tenancy_id, renter_id) WHERE role = 'tenant'`,
      `ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_checked_at date`,
      `ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_method text`,
      `ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_expires_at date`,
      `ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS deposit_return jsonb`,
      `ALTER TABLE landlords ADD COLUMN IF NOT EXISTS prs_registration_number text`,
      `ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_amount numeric(10, 2)`,
      `ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_paid_at date`,
      `ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_outcome text`,
      `ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_outcome_at date`,
      `ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_note text`,
      `CREATE TABLE IF NOT EXISTS tenancy_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid NOT NULL REFERENCES branches(id),
  tenancy_id uuid NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent',
  terms jsonb NOT NULL,
  terms_hash text NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
)`,
      `CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_tenancy ON tenancy_agreements(tenancy_id)`,
      `CREATE TABLE IF NOT EXISTS agreement_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  agreement_id uuid NOT NULL REFERENCES tenancy_agreements(id) ON DELETE CASCADE,
  role text NOT NULL,
  full_name text NOT NULL,
  email text,
  token_hash text NOT NULL,
  signed_name text,
  signed_at timestamptz,
  signed_ip text,
  signed_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS agreement_signatures_token ON agreement_signatures(token_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_agreement_signatures_agreement ON agreement_signatures(agreement_id)`,
    ],
  },
  {
    // drizzle/0017_money_tools.sql
    name: "money_tools",
    probe: `SELECT (${col("landlords", "nrl_status")} AND ${col("tenancies", "arrears_reminders")}) AS ok`,
    statements: [
      `ALTER TABLE landlords ADD COLUMN IF NOT EXISTS service_level text`,
      `ALTER TABLE landlords ADD COLUMN IF NOT EXISTS fee_percent numeric(5, 2)`,
      `ALTER TABLE landlords ADD COLUMN IF NOT EXISTS letting_fee numeric(10, 2)`,
      `ALTER TABLE landlords ADD COLUMN IF NOT EXISTS nrl_status text`,
      `ALTER TABLE landlords ADD COLUMN IF NOT EXISTS nrl_approval_ref text`,
      `ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS payment_plan jsonb`,
      `ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS arrears_reminders jsonb`,
    ],
  },
];

const pendingByUrl = new Map<string, Promise<void>>();

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function applyFeatureMigrations(url: string): Promise<void> {
  const sql = neon(url);
  for (const group of FEATURE_MIGRATIONS) {
    try {
      const rows = (await sql(group.probe)) as { ok: boolean }[];
      if (rows[0]?.ok) continue;
    } catch {
      // Fall through and run the statements.
    }
    for (const statement of group.statements) {
      try {
        await sql(statement);
      } catch (err) {
        const msg = messageOf(err);
        if (/already exists|duplicate/i.test(msg)) continue;
        throw new Error(`${group.name} schema: ${msg}`);
      }
    }
  }
}

export async function ensureFeatureSchemaForUrl(url: string): Promise<void> {
  let pending = pendingByUrl.get(url);
  if (!pending) {
    pending = applyFeatureMigrations(url).catch((err) => {
      pendingByUrl.delete(url);
      throw err;
    });
    pendingByUrl.set(url, pending);
  }
  await pending;
}

export async function ensureFeatureSchema(forAgency?: Agency): Promise<void> {
  const agency = forAgency ?? getAgencyOrNull();
  const url = agency
    ? agency.runtime.databaseUrl ||
      (ISOLATED_AGENCY_SLUGS.has(agency.slug) ? undefined : process.env.DATABASE_URL)
    : process.env.DATABASE_URL;
  if (!url) return;
  await ensureFeatureSchemaForUrl(url);
}
