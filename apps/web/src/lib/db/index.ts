import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

let client: Db | undefined;

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local or Vercel environment variables."
    );
  }
  return drizzle(neon(url), { schema });
}

export function getDb(): Db {
  if (!client) client = createDb();
  return client;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof Db];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Database = Db;
