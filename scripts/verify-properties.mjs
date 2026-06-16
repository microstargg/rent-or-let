import { neon } from "@neondatabase/serverless";
import pkg from "@next/env";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.log("No DATABASE_URL");
  process.exit(0);
}

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT slug, deposit, epc_rating, summary
  FROM properties
  WHERE slug IN (
    'ferndale-avenue-middlesbrough-ts3-9ds',
    'howe-street-middlesbrough-ts1-4ld'
  )
`;

const imgs = await sql`
  SELECT p.slug, count(pi.id)::int as image_count
  FROM properties p
  LEFT JOIN property_images pi ON pi.property_id = p.id
  WHERE p.slug IN (
    'ferndale-avenue-middlesbrough-ts3-9ds',
    'howe-street-middlesbrough-ts1-4ld'
  )
  GROUP BY p.slug
`;

console.log("Properties:", JSON.stringify(rows, null, 2));
console.log("Images:", JSON.stringify(imgs, null, 2));
