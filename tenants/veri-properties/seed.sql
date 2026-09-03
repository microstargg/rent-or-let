INSERT INTO branches (id, name, address, phone)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Veri Properties',
  'Suite 2, 18 King Street, Manchester, M2 6AQ',
  '0161 000 0000'
) ON CONFLICT DO NOTHING;

