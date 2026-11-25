-- Landlord register ("Register your rental property") tracking.
-- Also applied at runtime by apps/web/src/lib/db/feature-migrations.ts

ALTER TABLE properties ADD COLUMN IF NOT EXISTS prs_property_number text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS prs_registered_at date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS prs_region text;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS prs_renewal_date date;
