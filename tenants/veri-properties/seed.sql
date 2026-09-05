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
