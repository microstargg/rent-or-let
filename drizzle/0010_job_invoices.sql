-- Link maintenance jobs to invoices so approved works can be billed on landlord statements.

ALTER TABLE invoices ALTER COLUMN tenancy_id DROP NOT NULL;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES landlords(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_work_order ON invoices(work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_property ON invoices(property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_landlord ON invoices(landlord_id);

ALTER TABLE landlord_ledger_entries ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
