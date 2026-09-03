import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.resolve(__dirname, "../../apps/web"));

export default defineConfig({
  schema: "../../apps/web/src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
