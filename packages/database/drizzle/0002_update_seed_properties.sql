-- Align Ferndale Avenue and Howe Street with legacy site content and imported photos.

UPDATE properties
SET
  deposit = 650,
  available_from = '2026-04-13',
  summary = '£650.00 Per Calendar Month, 3 Bedroom Terraced House, Part Furnished.',
  description = 'This property benefits from double glazing, gas central heating, very good carpets/flooring, fitted blinds & good decoration throughout.

The ground floor briefly comprises a hall/lobby, a large through lounge with French doors leading out to the rear patio/garden area, and a modern fitted oak kitchen, black worktops and a built-in oven/hob. On the first floor are three bedrooms and a family bathroom with a shower over the bath. Driveway to the front and patio/garden area to the rear of the property.

The bond is £650.00, and references are required.

Council Tax band A
EPC Rating – TBC',
  features = '[
    "Double glazing",
    "Gas central heating",
    "Part furnished",
    "Through lounge with French doors to rear garden",
    "Modern fitted kitchen with built-in oven/hob",
    "Three bedrooms",
    "Family bathroom with shower over bath",
    "Driveway to front",
    "Patio/garden to rear",
    "Council Tax band A"
  ]'::jsonb,
  epc_rating = 'TBC',
  updated_at = now()
WHERE slug = 'ferndale-avenue-middlesbrough-ts3-9ds';

UPDATE properties
SET
  deposit = 750,
  available_from = '2026-04-13',
  summary = 'Furnished three-bedroom terraced house — £750 PCM (bills not included)',
  description = 'FURNISHED THREE-BEDROOM TERRACED HOUSE

Rent £750.00 PCM

*BILLS NOT INCLUDED*

The deposit is £750.00, or a guarantor is required with references.

This property is of a good standard and benefits from double glazing, gas central heating, stylish decoration, blinds, wooden flooring, kitchen appliances, furniture, a flat-screen TV, a leather sofa, beds, and lots of extra storage space.

EPC rating D

Council Tax Band A',
  features = '[
    "Fully furnished",
    "Double glazing",
    "Gas central heating",
    "Wooden flooring",
    "Kitchen appliances included",
    "Flat-screen TV, leather sofa and beds",
    "Extra storage space",
    "Bills not included",
    "Council Tax Band A",
    "EPC rating D"
  ]'::jsonb,
  epc_rating = 'D',
  updated_at = now()
WHERE slug = 'howe-street-middlesbrough-ts1-4ld';

DELETE FROM property_images
WHERE property_id IN (
  SELECT id FROM properties
  WHERE slug IN (
    'ferndale-avenue-middlesbrough-ts3-9ds',
    'howe-street-middlesbrough-ts1-4ld'
  )
);

INSERT INTO property_images (property_id, url, alt_text, sort_order, is_primary)
SELECT p.id, img.url, img.alt_text, img.sort_order, img.is_primary
FROM properties p
JOIN (
  VALUES
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/01.jpg', 'Ferndale Avenue, Middlesbrough', 0, true),
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/02.jpg', 'Ferndale Avenue, Middlesbrough', 1, false),
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/03.jpg', 'Ferndale Avenue, Middlesbrough', 2, false),
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/04.jpg', 'Ferndale Avenue, Middlesbrough', 3, false),
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/05.jpg', 'Ferndale Avenue, Middlesbrough', 4, false),
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/06.jpg', 'Ferndale Avenue, Middlesbrough', 5, false),
    ('ferndale-avenue-middlesbrough-ts3-9ds', '/properties/ferndale-avenue-middlesbrough-ts3-9ds/07.jpg', 'Ferndale Avenue, Middlesbrough', 6, false),
    ('howe-street-middlesbrough-ts1-4ld', '/properties/howe-street-middlesbrough-ts1-4ld/01.jpg', 'Howe Street, Middlesbrough', 0, true),
    ('howe-street-middlesbrough-ts1-4ld', '/properties/howe-street-middlesbrough-ts1-4ld/02.jpg', 'Howe Street, Middlesbrough', 1, false),
    ('howe-street-middlesbrough-ts1-4ld', '/properties/howe-street-middlesbrough-ts1-4ld/03.jpg', 'Howe Street, Middlesbrough', 2, false),
    ('howe-street-middlesbrough-ts1-4ld', '/properties/howe-street-middlesbrough-ts1-4ld/04.jpg', 'Howe Street, Middlesbrough', 3, false),
    ('howe-street-middlesbrough-ts1-4ld', '/properties/howe-street-middlesbrough-ts1-4ld/05.jpg', 'Howe Street, Middlesbrough', 4, false),
    ('howe-street-middlesbrough-ts1-4ld', '/properties/howe-street-middlesbrough-ts1-4ld/06.jpg', 'Howe Street, Middlesbrough', 5, false)
) AS img(slug, url, alt_text, sort_order, is_primary) ON p.slug = img.slug;
