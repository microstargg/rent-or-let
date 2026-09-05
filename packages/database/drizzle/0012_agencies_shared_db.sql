-- Shared multi-tenant: agencies table + agency_id on all operational tables.
-- Backfill existing rows as 'pms', then seed empty 'veri-properties'.

CREATE TABLE IF NOT EXISTS agencies (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform_host TEXT NOT NULL,
  public_site_url TEXT,
  website_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO agencies (slug, name, platform_host, public_site_url, website_enabled)
VALUES (
  'pms',
  'Property Management Services',
  'pms.letflow.app',
  'https://www.rent-or-let.co.uk',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Add nullable agency_id columns
ALTER TABLE branches ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE portal_sync_logs ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE portal_sync_jobs ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE cookie_consents ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE renters ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE renter_profiles ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE renter_invites ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE payment_exceptions ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE compliance_items ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE landlord_ledger_entries ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE landlord_statements ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE landlord_payouts ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE landlord_profiles ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE landlord_invites ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS agency_id TEXT;
ALTER TABLE pet_requests ADD COLUMN IF NOT EXISTS agency_id TEXT;
-- bank_* tables may not exist on older Neon branches; add only when present
DO $$ BEGIN
  IF to_regclass('public.bank_connections') IS NOT NULL THEN
    ALTER TABLE bank_connections ADD COLUMN IF NOT EXISTS agency_id TEXT;
  END IF;
  IF to_regclass('public.bank_transactions') IS NOT NULL THEN
    ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS agency_id TEXT;
  END IF;
END $$;

-- Backfill
UPDATE branches SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE staff_profiles SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE landlords SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE properties SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE site_content SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE enquiries SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE tenant_applications SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE complaints SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE portal_sync_logs SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE portal_sync_jobs SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE cookie_consents SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE renters SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE tenancies SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE invoices SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE payments SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE contractors SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE tickets SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE ticket_messages SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE work_orders SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE renter_profiles SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE renter_invites SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE ledger_entries SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE payment_allocations SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE payment_exceptions SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE tasks SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE documents SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE compliance_items SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE landlord_ledger_entries SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE landlord_statements SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE landlord_payouts SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE viewings SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE landlord_profiles SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE landlord_invites SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE inspections SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE notices SET agency_id = 'pms' WHERE agency_id IS NULL;
UPDATE pet_requests SET agency_id = 'pms' WHERE agency_id IS NULL;
DO $$ BEGIN
  IF to_regclass('public.bank_connections') IS NOT NULL THEN
    EXECUTE 'UPDATE bank_connections SET agency_id = ''pms'' WHERE agency_id IS NULL';
  END IF;
  IF to_regclass('public.bank_transactions') IS NOT NULL THEN
    EXECUTE 'UPDATE bank_transactions SET agency_id = ''pms'' WHERE agency_id IS NULL';
  END IF;
END $$;

-- NOT NULL
ALTER TABLE branches ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE staff_profiles ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE landlords ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE site_content ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE enquiries ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE tenant_applications ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE complaints ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE portal_sync_logs ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE portal_sync_jobs ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE cookie_consents ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE renters ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE tenancies ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE contractors ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE ticket_messages ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE work_orders ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE renter_profiles ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE renter_invites ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE ledger_entries ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE payment_allocations ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE payment_exceptions ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE compliance_items ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE landlord_ledger_entries ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE landlord_statements ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE landlord_payouts ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE viewings ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE landlord_profiles ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE landlord_invites ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE inspections ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE notices ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE pet_requests ALTER COLUMN agency_id SET NOT NULL;
DO $$ BEGIN
  IF to_regclass('public.bank_connections') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE bank_connections ALTER COLUMN agency_id SET NOT NULL';
  END IF;
  IF to_regclass('public.bank_transactions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE bank_transactions ALTER COLUMN agency_id SET NOT NULL';
  END IF;
END $$;

-- Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE branches ADD CONSTRAINT branches_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE landlords ADD CONSTRAINT landlords_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE properties ADD CONSTRAINT properties_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE site_content ADD CONSTRAINT site_content_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE enquiries ADD CONSTRAINT enquiries_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE tenant_applications ADD CONSTRAINT tenant_applications_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE complaints ADD CONSTRAINT complaints_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE portal_sync_logs ADD CONSTRAINT portal_sync_logs_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE portal_sync_jobs ADD CONSTRAINT portal_sync_jobs_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE cookie_consents ADD CONSTRAINT cookie_consents_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE renters ADD CONSTRAINT renters_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE tenancies ADD CONSTRAINT tenancies_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT invoices_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE contractors ADD CONSTRAINT contractors_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT tickets_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ticket_messages ADD CONSTRAINT ticket_messages_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE work_orders ADD CONSTRAINT work_orders_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE renter_profiles ADD CONSTRAINT renter_profiles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE renter_invites ADD CONSTRAINT renter_invites_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE payment_exceptions ADD CONSTRAINT payment_exceptions_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE documents ADD CONSTRAINT documents_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE compliance_items ADD CONSTRAINT compliance_items_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE landlord_ledger_entries ADD CONSTRAINT landlord_ledger_entries_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE landlord_statements ADD CONSTRAINT landlord_statements_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE landlord_payouts ADD CONSTRAINT landlord_payouts_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE viewings ADD CONSTRAINT viewings_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE landlord_profiles ADD CONSTRAINT landlord_profiles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE landlord_invites ADD CONSTRAINT landlord_invites_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE inspections ADD CONSTRAINT inspections_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE notices ADD CONSTRAINT notices_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE pet_requests ADD CONSTRAINT pet_requests_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  IF to_regclass('public.bank_connections') IS NOT NULL THEN
    ALTER TABLE bank_connections ADD CONSTRAINT bank_connections_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  IF to_regclass('public.bank_transactions') IS NOT NULL THEN
    ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES agencies(slug);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unique constraint changes for properties / staff / site_content
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_slug_key;
DROP INDEX IF EXISTS properties_slug_key;
DROP INDEX IF EXISTS properties_branch_agent_ref;
CREATE UNIQUE INDEX IF NOT EXISTS properties_agency_slug ON properties (agency_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS properties_agency_branch_agent_ref ON properties (agency_id, branch_id, agent_ref);
DROP INDEX IF EXISTS idx_properties_status;
CREATE INDEX IF NOT EXISTS idx_properties_agency_status ON properties (agency_id, status);

ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_agency_email ON staff_profiles (agency_id, email);

ALTER TABLE site_content DROP CONSTRAINT IF EXISTS site_content_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS site_content_agency_key ON site_content (agency_id, key);

CREATE INDEX IF NOT EXISTS idx_branches_agency ON branches (agency_id);

-- Empty Veri agency + default branch
INSERT INTO agencies (slug, name, platform_host, public_site_url, website_enabled)
VALUES (
  'veri-properties',
  'Veri Properties',
  'veri.letflow.app',
  'https://veri.properties',
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO branches (id, agency_id, name, address, phone)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'veri-properties',
  'Veri Properties',
  'Suite 2, 18 King Street, Manchester, M2 6AQ',
  '0161 000 0000'
)
ON CONFLICT (id) DO UPDATE SET agency_id = EXCLUDED.agency_id;
