import { neon } from "@neondatabase/serverless";

/**
 * Idempotent Brogden Green seed from drizzle/0011_seed_brogden_green.sql.
 * Applied at runtime so production Neon gets the live listing even if
 * `db:push` / apply-migration was not run locally.
 */
export const BROGDEN_GREEN_SLUG = "brogden-green-middlesbrough-ts3";

export const BROGDEN_GREEN_SEED_STATEMENTS = [
  `INSERT INTO properties (
  branch_id, agent_ref, slug, display_address,
  house_name_number, street, town, postcode,
  price_pcm, deposit, available_from, bedrooms, bathrooms,
  property_type, furnished, status, description, summary, features, epc_rating, published_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'PMS-003',
  'brogden-green-middlesbrough-ts3',
  'Brogden Green, Middlesbrough, TS3',
  '',
  'Brogden Green',
  'Middlesbrough',
  'TS3',
  680,
  680,
  '2026-06-22',
  2,
  1,
  'terraced',
  'part_furnished',
  'available',
  'This property benefits from double glazing, gas central heating, new flooring/carpets, a new bathroom suite, newly fitted blinds & new decoration throughout.

The ground floor briefly comprises a hall/lobby, lounge with wooden flooring, kitchen and outside storage. On the first floor are two bedrooms and a family bathroom with an electric shower over the bath. Gardens to the front and rear of the property.

The bond is £680.00, and references are required.

EPC Rating C',
  '£680.00 Per Calendar Month, 2 Bedroom Terraced House, Part Furnished.',
  '[
    "Double glazing",
    "Gas central heating",
    "Part furnished",
    "New flooring/carpets",
    "New bathroom suite",
    "Newly fitted blinds",
    "New decoration throughout",
    "Lounge with wooden flooring",
    "Kitchen and outside storage",
    "Two bedrooms",
    "Family bathroom with electric shower over bath",
    "Gardens to front and rear",
    "EPC Rating C"
  ]'::jsonb,
  'C',
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  agent_ref = EXCLUDED.agent_ref,
  display_address = EXCLUDED.display_address,
  street = EXCLUDED.street,
  town = EXCLUDED.town,
  postcode = EXCLUDED.postcode,
  price_pcm = EXCLUDED.price_pcm,
  deposit = EXCLUDED.deposit,
  available_from = EXCLUDED.available_from,
  bedrooms = EXCLUDED.bedrooms,
  bathrooms = EXCLUDED.bathrooms,
  property_type = EXCLUDED.property_type,
  furnished = EXCLUDED.furnished,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  summary = EXCLUDED.summary,
  features = EXCLUDED.features,
  epc_rating = EXCLUDED.epc_rating,
  updated_at = now()`,
  `DELETE FROM property_images
WHERE property_id IN (
  SELECT id FROM properties
  WHERE slug = 'brogden-green-middlesbrough-ts3'
)`,
  `INSERT INTO property_images (property_id, url, alt_text, sort_order, is_primary)
SELECT p.id, img.url, img.alt_text, img.sort_order, img.is_primary
FROM properties p
JOIN (
  VALUES
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/01.jpg', 'Brogden Green, Middlesbrough', 0, true),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/02.jpg', 'Brogden Green, Middlesbrough', 1, false),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/03.jpg', 'Brogden Green, Middlesbrough', 2, false),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/04.jpg', 'Brogden Green, Middlesbrough', 3, false),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/05.jpg', 'Brogden Green, Middlesbrough', 4, false),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/06.jpg', 'Brogden Green, Middlesbrough', 5, false),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/07.jpg', 'Brogden Green, Middlesbrough', 6, false),
    ('brogden-green-middlesbrough-ts3', '/properties/brogden-green-middlesbrough-ts3/08.jpg', 'Brogden Green, Middlesbrough', 7, false)
) AS img(slug, url, alt_text, sort_order, is_primary) ON p.slug = img.slug`,
] as const;

let pending: Promise<void> | null = null;

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function applyBrogdenGreenSeed(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const sql = neon(url);
  for (const statement of BROGDEN_GREEN_SEED_STATEMENTS) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = messageOf(err);
      if (/already exists|duplicate/i.test(msg)) continue;
      throw new Error(`Brogden Green seed failed: ${msg}`);
    }
  }
}

export async function ensureSeedLiveProperties(opts?: { force?: boolean }): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (opts?.force) pending = null;
  if (!pending) {
    pending = applyBrogdenGreenSeed().catch((err) => {
      pending = null;
      throw err;
    });
  }
  await pending;
}
