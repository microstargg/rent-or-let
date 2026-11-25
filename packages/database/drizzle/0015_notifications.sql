-- Staff job assignment, tasks on the jobs board, in-app notifications and email preferences.
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assignee_staff_id text;
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(assignee_staff_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_staff_id);

ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id text NOT NULL REFERENCES agencies(slug),
  staff_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  dedupe_key text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_staff ON notifications(agency_id, staff_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe ON notifications(agency_id, staff_id, dedupe_key);
