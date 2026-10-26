-- Individual per-property statements, generated alongside each overall client statement.
-- property_id is null on the overall statement; parent_statement_id links a property statement to it.

ALTER TABLE landlord_statements ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE landlord_statements ADD COLUMN IF NOT EXISTS parent_statement_id uuid REFERENCES landlord_statements(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_landlord_statements_parent ON landlord_statements(parent_statement_id);
