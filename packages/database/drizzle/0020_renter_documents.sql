-- Renter profile documents (Right to Rent evidence, ID, references) and private file storage.
-- Also applied at runtime by apps/web/src/lib/db/feature-migrations.ts

ALTER TABLE renters ADD COLUMN IF NOT EXISTS rtr_share_code text;

CREATE TABLE IF NOT EXISTS private_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  data_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS renter_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  branch_id uuid NOT NULL REFERENCES branches(id),
  renter_id uuid NOT NULL REFERENCES renters(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text,
  storage_key text NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  sha256 text NOT NULL,
  uploaded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renter_documents_renter ON renter_documents(renter_id);
