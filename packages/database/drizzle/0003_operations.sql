-- Let Flow operational tools: landlords, renters, tenancies, finance, tickets, portal

ALTER TABLE branches ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE properties ADD COLUMN IF NOT EXISTS landlord_id uuid;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_vacant boolean NOT NULL DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS boiler_model text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS boiler_install_date date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS landlords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  bank_details jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landlords_branch ON landlords(branch_id);

ALTER TABLE properties
  ADD CONSTRAINT properties_landlord_id_fkey
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS renters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  landlord_id uuid REFERENCES landlords(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  employment_info jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renters_branch ON renters(branch_id);

CREATE TABLE IF NOT EXISTS tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  primary_renter_id uuid NOT NULL REFERENCES renters(id) ON DELETE RESTRICT,
  rent_amount numeric(12, 2) NOT NULL,
  rent_frequency text NOT NULL DEFAULT 'monthly',
  deposit_amount numeric(12, 2),
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  deposit_scheme text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenancies_branch ON tenancies(branch_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_property ON tenancies(property_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_status ON tenancies(status);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  tenancy_id uuid NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  type text NOT NULL,
  due_date date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  status text NOT NULL DEFAULT 'due',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_due ON invoices(branch_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_tenancy ON invoices(tenancy_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'bank_transfer',
  external_ref text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_branch_external_ref ON payments(branch_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  name text NOT NULL,
  email text,
  phone text,
  trade text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contractors_branch ON contractors(branch_id);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  reported_by_type text NOT NULL,
  reported_by_id uuid,
  source text NOT NULL DEFAULT 'staff',
  category text,
  priority text,
  status text NOT NULL DEFAULT 'new',
  summary text NOT NULL,
  description text,
  location_area text,
  is_emergency boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_branch_status ON tickets(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_property ON tickets(property_id);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_id uuid,
  channel text NOT NULL DEFAULT 'portal',
  body text NOT NULL,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES contractors(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft',
  cost_estimate numeric(12, 2),
  final_cost numeric(12, 2),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_orders_ticket ON work_orders(ticket_id);

CREATE TABLE IF NOT EXISTS renter_profiles (
  id text PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES branches(id),
  renter_id uuid NOT NULL REFERENCES renters(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS renter_profiles_renter ON renter_profiles(renter_id);
CREATE INDEX IF NOT EXISTS idx_renter_profiles_branch ON renter_profiles(branch_id);

CREATE TABLE IF NOT EXISTS renter_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  renter_id uuid NOT NULL REFERENCES renters(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renter_invites_token ON renter_invites(token);
