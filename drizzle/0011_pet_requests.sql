-- Phase G: pet requests (RRA s.16A)

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
);
CREATE INDEX IF NOT EXISTS idx_pet_requests_tenancy ON pet_requests(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_pet_requests_branch_status ON pet_requests(branch_id, status);
