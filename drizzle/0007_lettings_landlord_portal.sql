-- Phase E: lettings funnel + landlord portal

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new';
ALTER TABLE tenant_applications ADD COLUMN IF NOT EXISTS referencing_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS viewings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  enquiry_id uuid REFERENCES enquiries(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  outcome text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_viewings_property ON viewings(property_id);

CREATE TABLE IF NOT EXISTS landlord_profiles (
  id text PRIMARY KEY,
  branch_id uuid NOT NULL REFERENCES branches(id),
  landlord_id uuid NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS landlord_profiles_landlord ON landlord_profiles(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_profiles_branch ON landlord_profiles(branch_id);

CREATE TABLE IF NOT EXISTS landlord_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id),
  landlord_id uuid NOT NULL REFERENCES landlords(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landlord_invites_token ON landlord_invites(token);
