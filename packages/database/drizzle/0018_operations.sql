-- Activity log, keys register, viewing confirmations and feedback, damp and mould clocks, utility notices.
-- Also applied at runtime by apps/web/src/lib/db/feature-migrations.ts

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  property_id uuid,
  tenancy_id uuid,
  actor_id text,
  actor_name text,
  action text NOT NULL,
  summary text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_property ON activity_log(property_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenancy ON activity_log(tenancy_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_id, created_at);
CREATE TABLE IF NOT EXISTS property_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid NOT NULL REFERENCES branches(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_count integer NOT NULL DEFAULT 1,
  holder_type text NOT NULL DEFAULT 'office',
  holder_name text,
  out_since date,
  due_back date,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_keys_property ON property_keys(property_id);
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS attendee_name text;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS attendee_email text;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS attendee_phone text;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE viewings ADD COLUMN IF NOT EXISTS feedback_sent_at timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS hazard jsonb;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS utility_notices jsonb;
