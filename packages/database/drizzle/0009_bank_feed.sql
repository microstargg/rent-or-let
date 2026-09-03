-- Open Banking AIS bank feed (TrueLayer)

CREATE TABLE IF NOT EXISTS bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
);
CREATE INDEX IF NOT EXISTS idx_bank_connections_branch ON bank_connections(branch_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_branch_status ON bank_connections(branch_id, status);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_branch_provider_txn
  ON bank_transactions(branch_id, provider_txn_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_connection ON bank_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_status
  ON bank_transactions(branch_id, match_status);
