-- Month-end reconciliation: jobs carry a client charge separate from the contractor cost,
-- and outgoing bank lines link to the landlord payout or contractor job they paid.

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS client_charge numeric(12, 2);

ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS landlord_payout_id uuid REFERENCES landlord_payouts(id) ON DELETE SET NULL;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_payout ON bank_transactions(landlord_payout_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_work_order ON bank_transactions(work_order_id);
