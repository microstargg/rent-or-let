-- Joint tenants, guarantors, Right to Rent, deposit return, holding deposits,
-- PRS Database numbers and e-signed tenancy agreements.
-- Also applied at runtime by apps/web/src/lib/db/feature-migrations.ts

CREATE TABLE IF NOT EXISTS tenancy_parties (
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
);

CREATE INDEX IF NOT EXISTS idx_tenancy_parties_tenancy ON tenancy_parties(tenancy_id);

CREATE UNIQUE INDEX IF NOT EXISTS tenancy_parties_tenant ON tenancy_parties(tenancy_id, renter_id) WHERE role = 'tenant';

ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_checked_at date;

ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_method text;

ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_expires_at date;

ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS deposit_return jsonb;

ALTER TABLE landlords ADD COLUMN IF NOT EXISTS prs_registration_number text;

ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_amount numeric(10, 2);

ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_paid_at date;

ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_outcome text;

ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_outcome_at date;

ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS holding_deposit_note text;

CREATE TABLE IF NOT EXISTS tenancy_agreements (
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
);

CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_tenancy ON tenancy_agreements(tenancy_id);

CREATE TABLE IF NOT EXISTS agreement_signatures (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS agreement_signatures_token ON agreement_signatures(token_hash);

CREATE INDEX IF NOT EXISTS idx_agreement_signatures_agreement ON agreement_signatures(agreement_id);
