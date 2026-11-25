-- Per-landlord fees, non-resident landlord tax, arrears plans and reminders.
-- Also applied at runtime by apps/web/src/lib/db/feature-migrations.ts

ALTER TABLE landlords ADD COLUMN IF NOT EXISTS service_level text;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS fee_percent numeric(5, 2);
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS letting_fee numeric(10, 2);
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS nrl_status text;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS nrl_approval_ref text;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS payment_plan jsonb;
ALTER TABLE tenancies ADD COLUMN IF NOT EXISTS arrears_reminders jsonb;
