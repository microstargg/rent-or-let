ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS rightmove_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS otm_sync_enabled boolean NOT NULL DEFAULT false;
