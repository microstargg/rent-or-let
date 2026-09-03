import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tenantId = process.env.TENANT_ID ?? "pms";
const tenantDir = path.join(root, "tenants", tenantId);
const assetsDir = path.join(tenantDir, "assets");
const appDir = path.join(root, "apps", "web", "src", "app");
const themeDest = path.join(root, "apps", "web", "src", "app", "tenant-theme.css");

if (!fs.existsSync(tenantDir)) {
  console.error(`Tenant not found: ${tenantDir}`);
  process.exit(1);
}

if (fs.existsSync(assetsDir)) {
  for (const file of fs.readdirSync(assetsDir)) {
    const src = path.join(assetsDir, file);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, path.join(appDir, file));
    console.log(`Copied ${file} → apps/web/src/app/`);
  }
} else {
  console.warn(`No assets directory for tenant ${tenantId}`);
}

const themeSrc = path.join(tenantDir, "theme.css");
if (fs.existsSync(themeSrc)) {
  fs.copyFileSync(themeSrc, themeDest);
  console.log(`Copied theme.css → apps/web/src/app/tenant-theme.css`);
}

console.log(`Prepared tenant: ${tenantId}`);
