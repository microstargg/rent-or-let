-- Same Neon Auth / Google user may belong to multiple agencies.
-- Membership is (agency_id, auth user id), chosen by the subdomain they sign in on.

ALTER TABLE staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_pkey;
ALTER TABLE staff_profiles ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (agency_id, id);

ALTER TABLE renter_profiles DROP CONSTRAINT IF EXISTS renter_profiles_pkey;
ALTER TABLE renter_profiles ADD CONSTRAINT renter_profiles_pkey PRIMARY KEY (agency_id, id);

ALTER TABLE landlord_profiles DROP CONSTRAINT IF EXISTS landlord_profiles_pkey;
ALTER TABLE landlord_profiles ADD CONSTRAINT landlord_profiles_pkey PRIMARY KEY (agency_id, id);

CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id TEXT NOT NULL REFERENCES agencies(slug),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_invites_agency_email ON staff_invites (agency_id, email);

INSERT INTO staff_profiles (id, agency_id, email, full_name, role)
SELECT id, 'veri-properties', email, full_name, role
FROM staff_profiles
WHERE lower(email) = 'sirmicrostar@gmail.com'
  AND agency_id <> 'veri-properties'
LIMIT 1
ON CONFLICT DO NOTHING;
