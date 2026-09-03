-- Phase F: deposits, inspections, notices

ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS deposit_protected_at date;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS deposit_protection_ref text;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS rent_review_date date;

CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  type text NOT NULL,
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text,
  summary text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspections_property ON inspections(property_id);

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  tenancy_id uuid NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  type text NOT NULL,
  served_at timestamptz,
  effective_at date,
  grounds text,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_tenancy ON notices(tenancy_id);
