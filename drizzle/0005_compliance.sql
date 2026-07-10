-- Phase B: documents + compliance items

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  filename text,
  served_at timestamptz,
  served_to text,
  served_channel text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_branch ON documents(branch_id);

CREATE TABLE IF NOT EXISTS compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'missing',
  issued_at date,
  expires_at date,
  reference text,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_property ON compliance_items(property_id);
CREATE INDEX IF NOT EXISTS idx_compliance_branch_status ON compliance_items(branch_id, status);
