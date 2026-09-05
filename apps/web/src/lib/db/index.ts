import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { getAgency } from "@repo/config/server";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

const clients = new Map<string, Db>();

function createDb(url: string): Db {
  return drizzle(neon(url), { schema });
}

export function getDb(): Db {
  const agency = getAgency();
  const url = agency.runtime.databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      `DATABASE_URL is not set for agency "${agency.slug}". Set AGENCY_${agency.slug.replace(/-/g, "_").toUpperCase()}_DATABASE_URL or DATABASE_URL.`
    );
  }
  let client = clients.get(url);
  if (!client) {
    client = createDb(url);
    clients.set(url, client);
  }
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
