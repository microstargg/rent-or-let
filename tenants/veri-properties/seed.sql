INSERT INTO agencies (slug, name, platform_host, public_site_url, website_enabled)
VALUES (
  'veri-properties',
  'Veri Properties',
  'veri.letflow.app',
  'https://veri.properties',
  true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO branches (id, agency_id, name, address, phone)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'veri-properties',
  'Veri Properties',
  'Suite 2, 18 King Street, Manchester, M2 6AQ',
  '0161 000 0000'
) ON CONFLICT (id) DO NOTHING;

-- Same Google user can be staff on Veri and PMS (copy Neon Auth id from an existing row).
INSERT INTO staff_profiles (id, agency_id, email, full_name, role)
SELECT id, 'veri-properties', email, full_name, role
FROM staff_profiles
WHERE lower(email) = 'sirmicrostar@gmail.com'
  AND agency_id <> 'veri-properties'
LIMIT 1
ON CONFLICT DO NOTHING;
