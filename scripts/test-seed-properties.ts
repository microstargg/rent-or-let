/**
 * Checks seed listings include Brogden Green with imported photos (no database).
 * npx tsx scripts/test-seed-properties.ts
 */
import { existsSync, statSync } from "fs";
import { join } from "path";
import {
  getAvailableProperties,
  getPropertyBySlug,
} from "../src/lib/data/properties";
import {
  BROGDEN_GREEN_SEED_STATEMENTS,
  BROGDEN_GREEN_SLUG,
} from "../src/lib/db/ensure-seed-properties";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const SLUG = "brogden-green-middlesbrough-ts3";
const PHOTO_COUNT = 8;

async function main() {
  delete process.env.DATABASE_URL;

  const properties = await getAvailableProperties();
  assert(properties.length === 3, "seed catalogue has three live-site houses");
  assert(
    properties.some((p) => p.slug === "ferndale-avenue-middlesbrough-ts3-9ds"),
    "includes Ferndale Avenue"
  );
  assert(
    properties.some((p) => p.slug === "howe-street-middlesbrough-ts1-4ld"),
    "includes Howe Street"
  );

  const property = await getPropertyBySlug(SLUG);
  assert(property, "Brogden Green is available by slug");
  assert(property?.display_address === "Brogden Green, Middlesbrough, TS3", "display address matches live listing");
  assert(property?.price_pcm === 680, "rent is £680 pcm");
  assert(property?.deposit === 680, "bond is £680");
  assert(property?.bedrooms === 2, "two bedrooms");
  assert(property?.bathrooms === 1, "one bathroom");
  assert(property?.property_type === "terraced", "terraced house");
  assert(property?.furnished === "part_furnished", "part furnished");
  assert(property?.epc_rating === "C", "EPC rating C");
  assert(property?.available_from === "2026-06-22", "available from live listing date");
  assert(
    property?.summary === "£680.00 Per Calendar Month, 2 Bedroom Terraced House, Part Furnished.",
    "summary matches live listing"
  );
  assert(property?.description.includes("electric shower over the bath"), "description includes bathroom detail");
  assert((property?.images?.length ?? 0) === PHOTO_COUNT, `gallery has ${PHOTO_COUNT} photos`);
  assert(property?.images?.[0]?.is_primary === true, "first photo is primary");
  assert(property?.images?.[0]?.url === `/properties/${SLUG}/01.jpg`, "primary photo path");

  for (let i = 1; i <= PHOTO_COUNT; i++) {
    const file = join("public", "properties", SLUG, `${String(i).padStart(2, "0")}.jpg`);
    assert(existsSync(file), `${file} exists`);
    assert(statSync(file).size > 50_000, `${file} is a real photo`);
  }

  assert(BROGDEN_GREEN_SLUG === SLUG, "runtime seed slug matches listing");
  assert(BROGDEN_GREEN_SEED_STATEMENTS.length === 3, "runtime seed has insert, image delete, image insert");
  assert(
    BROGDEN_GREEN_SEED_STATEMENTS[0].includes("ON CONFLICT (slug) DO UPDATE"),
    "runtime seed upserts on slug"
  );
  assert(
    BROGDEN_GREEN_SEED_STATEMENTS[2].includes("/properties/brogden-green-middlesbrough-ts3/08.jpg"),
    "runtime seed attaches eight photos"
  );

  console.log("\nSeed properties: ALL CHECKS PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
