import { neon } from "@neondatabase/serverless";
import { getAgencyBySlug } from "@repo/config/server";
import { DEMO_ACCOUNTS, DEMO_AGENCY_SLUG, DEMO_BRANCH_ID, DEMO_LANDLORD_ID, DEMO_RENTER_ID } from "./constants";
import { buildDemoDataset, DEMO_TABLE_ORDER } from "./dataset";
import { demoInsertStatements } from "./sql";

/** Every app table, including ones the seed leaves empty (visitors may have written to them). */
const WIPE_TABLES = [
  ...DEMO_TABLE_ORDER,
  "staff_profiles",
  "staff_invites",
  "renter_profiles",
  "renter_invites",
  "landlord_profiles",
  "landlord_invites",
  "property_images",
  "site_content",
  "portal_sync_logs",
  "portal_sync_jobs",
  "cookie_consents",
];

/**
 * The demo database URL, or an error saying why it is not safe to wipe.
 * Never resolves to the shared production database: the demo must have its own
 * AGENCY_DEMO_DATABASE_URL, and that database must hold no other agency's records.
 */
export function demoDatabaseUrl(): string {
  const url = getAgencyBySlug(DEMO_AGENCY_SLUG).runtime.databaseUrl;
  if (!url) throw new Error("AGENCY_DEMO_DATABASE_URL is not set; refusing to reset.");
  const shared = process.env.DATABASE_URL?.trim();
  if (shared && hostOf(shared) === hostOf(url)) {
    throw new Error("AGENCY_DEMO_DATABASE_URL points at the shared database; refusing to reset.");
  }
  return url;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace("-pooler.", ".");
  } catch {
    return url;
  }
}

export async function resetDemoData(now = new Date()) {
  const sql = neon(demoDatabaseUrl());

  const [foreign] = (await sql(
    `SELECT
       (SELECT count(*) FROM properties WHERE agency_id <> $1) +
       (SELECT count(*) FROM tenancies WHERE agency_id <> $1) +
       (SELECT count(*) FROM landlords WHERE agency_id <> $1) +
       (SELECT count(*) FROM renters WHERE agency_id <> $1) AS n`,
    [DEMO_AGENCY_SLUG]
  )) as Array<{ n: string }>;
  if (Number(foreign?.n ?? 0) > 0) {
    throw new Error("Demo database holds another agency's records; refusing to reset.");
  }

  const authUsers = await demoAuthUsers(sql);
  const inserts = demoInsertStatements(buildDemoDataset(now));
  const profiles = demoProfileStatements(authUsers);

  const started = Date.now();
  await sql.transaction([
    sql(`TRUNCATE ${[...new Set(WIPE_TABLES)].join(", ")} CASCADE`),
    ...inserts.map((s) => sql(s)),
    ...profiles.map(([text, params]) => sql(text, params)),
  ]);
  return { statements: inserts.length, linkedAccounts: authUsers.length, ms: Date.now() - started };
}

type AuthUser = { id: string; email: string };

/** Demo logins already created in Neon Auth, so they keep working straight after a reset. */
async function demoAuthUsers(sql: ReturnType<typeof neon<false, false>>): Promise<AuthUser[]> {
  const emails = Object.values(DEMO_ACCOUNTS).map((a) => a.email);
  try {
    return (await sql(`SELECT id::text AS id, lower(email) AS email FROM neon_auth."user" WHERE lower(email) = ANY($1)`, [
      emails,
    ])) as AuthUser[];
  } catch {
    return [];
  }
}

export function demoProfileStatements(users: AuthUser[]): Array<[string, unknown[]]> {
  const out: Array<[string, unknown[]]> = [];
  for (const user of users) {
    const statement = demoProfileStatement(user.email, user.id);
    if (statement) out.push(statement);
  }
  return out;
}

/** Upsert that links a demo login to its staff, landlord or renter record. */
export function demoProfileStatement(email: string, userId: string): [string, unknown[]] | null {
  const lower = email.toLowerCase();
  if (lower === DEMO_ACCOUNTS.staff.email) {
    return [
      `INSERT INTO staff_profiles (id, agency_id, email, full_name, role) VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT DO NOTHING`,
      [userId, DEMO_AGENCY_SLUG, lower, DEMO_ACCOUNTS.staff.name],
    ];
  }
  if (lower === DEMO_ACCOUNTS.landlord.email) {
    return [
      `INSERT INTO landlord_profiles (id, agency_id, branch_id, landlord_id, email) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [userId, DEMO_AGENCY_SLUG, DEMO_BRANCH_ID, DEMO_LANDLORD_ID, lower],
    ];
  }
  if (lower === DEMO_ACCOUNTS.renter.email) {
    return [
      `INSERT INTO renter_profiles (id, agency_id, branch_id, renter_id, email) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [userId, DEMO_AGENCY_SLUG, DEMO_BRANCH_ID, DEMO_RENTER_ID, lower],
    ];
  }
  return null;
}
