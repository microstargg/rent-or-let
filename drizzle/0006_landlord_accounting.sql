-- Phase C: landlord ledger, statements, payouts

CREATE TABLE IF NOT EXISTS landlord_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  landlord_id uuid NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES tenancies(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  work_order_id uuid,
  statement_id uuid,
  memo text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landlord_ledger_landlord ON landlord_ledger_entries(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_ledger_branch ON landlord_ledger_entries(branch_id);

CREATE TABLE IF NOT EXISTS landlord_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  landlord_id uuid NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  period_from date NOT NULL,
  period_to date NOT NULL,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landlord_statements_landlord ON landlord_statements(landlord_id);

CREATE TABLE IF NOT EXISTS landlord_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  landlord_id uuid NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'bank_transfer',
  external_ref text,
  statement_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landlord_payouts_landlord ON landlord_payouts(landlord_id);
