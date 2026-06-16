-- Neon migration (no Supabase auth / RLS)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rightmove_branch_id TEXT,
  otm_branch_id TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  agent_ref TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  display_address TEXT NOT NULL,
  house_name_number TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL,
  town TEXT NOT NULL,
  postcode TEXT NOT NULL,
  price_pcm NUMERIC(10,2) NOT NULL,
  deposit NUMERIC(10,2) NOT NULL,
  holding_deposit NUMERIC(10,2),
  available_from DATE NOT NULL,
  bedrooms INT NOT NULL,
  bathrooms INT NOT NULL DEFAULT 1,
  property_type TEXT NOT NULL,
  furnished TEXT NOT NULL DEFAULT 'unfurnished',
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT NOT NULL,
  summary TEXT,
  features JSONB NOT NULL DEFAULT '[]',
  permitted_payments JSONB DEFAULT '[]',
  epc_rating TEXT,
  virtual_tour_url TEXT,
  floorplan_url TEXT,
  epc_url TEXT,
  portal_sync JSONB NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id, agent_ref)
);

CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  employment_status TEXT NOT NULL,
  annual_income NUMERIC(12,2),
  current_address TEXT NOT NULL,
  move_in_date DATE,
  occupants INT NOT NULL DEFAULT 1,
  pets BOOLEAN NOT NULL DEFAULT false,
  pets_details TEXT,
  reference_data JSONB NOT NULL DEFAULT '{}',
  additional_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'website',
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  portal TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  portal TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cookie_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id TEXT NOT NULL,
  preferences JSONB NOT NULL,
  banner_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO branches (id, name, address, phone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Property Management Services - Middlesbrough',
  '11 Kings Road, North Ormesby, Middlesbrough, TS3 6NG',
  '01642 217 224'
) ON CONFLICT DO NOTHING;

INSERT INTO properties (
  branch_id, agent_ref, slug, display_address,
  house_name_number, street, town, postcode,
  price_pcm, deposit, available_from, bedrooms, bathrooms,
  property_type, furnished, status, description, summary, features, published_at
) VALUES
(
  '00000000-0000-0000-0000-000000000001', 'PMS-001',
  'ferndale-avenue-middlesbrough-ts3-9ds',
  'Ferndale Avenue, Middlesbrough, TS3 9DS',
  '', 'Ferndale Avenue', 'Middlesbrough', 'TS3 9DS',
  650, 750, CURRENT_DATE, 3, 1, 'terraced', 'part_furnished', 'available',
  'Three bedroom terraced house available in Middlesbrough. Part furnished with good transport links and local amenities nearby.',
  '3 bed terraced house, part furnished',
  '["Three bedrooms", "Part furnished", "Teesside location"]'::jsonb, now()
),
(
  '00000000-0000-0000-0000-000000000001', 'PMS-002',
  'howe-street-middlesbrough-ts1-4ld',
  'Howe Street, Middlesbrough, TS1 4LD',
  '', 'Howe Street', 'Middlesbrough', 'TS1 4LD',
  750, 865, CURRENT_DATE, 3, 1, 'terraced', 'furnished', 'available',
  'Furnished three-bedroom terraced house. Rent £750.00 PCM. Bills not included.',
  'Furnished 3 bed terraced house',
  '["Three bedrooms", "Fully furnished", "Central Middlesbrough"]'::jsonb, now()
) ON CONFLICT DO NOTHING;
