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
