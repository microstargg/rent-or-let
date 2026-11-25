-- Stronger online signing: email codes, audit trail and a stored signed PDF.
-- Also applied at runtime by apps/web/src/lib/db/feature-migrations.ts

ALTER TABLE agreement_signatures ADD COLUMN IF NOT EXISTS otp_hash text;
ALTER TABLE agreement_signatures ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz;
ALTER TABLE agreement_signatures ADD COLUMN IF NOT EXISTS otp_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE agreement_signatures ADD COLUMN IF NOT EXISTS otp_sent_at timestamptz;
ALTER TABLE agreement_signatures ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE tenancy_agreements ADD COLUMN IF NOT EXISTS signed_pdf_key text;
ALTER TABLE tenancy_agreements ADD COLUMN IF NOT EXISTS signed_pdf_sha256 text;

CREATE TABLE IF NOT EXISTS agreement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  agreement_id uuid NOT NULL REFERENCES tenancy_agreements(id) ON DELETE CASCADE,
  signature_id uuid REFERENCES agreement_signatures(id) ON DELETE SET NULL,
  event text NOT NULL,
  ip text,
  user_agent text,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_events_agreement ON agreement_events(agreement_id, created_at);
