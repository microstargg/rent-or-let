import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const tenantsDir = path.join(root, "tenants");
const targets = [
  path.join(root, "apps", "web", "public", "agencies"),
  path.join(root, "apps", "site", "public", "agencies"),
];

if (!fs.existsSync(tenantsDir)) {
  console.error(`Tenants folder not found: ${tenantsDir}`);
  process.exit(1);
}

const slugs = fs.readdirSync(tenantsDir).filter((name) => {
  const full = path.join(tenantsDir, name);
  return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "config.ts"));
});

for (const destRoot of targets) {
  fs.mkdirSync(destRoot, { recursive: true });
  for (const slug of slugs) {
    const assetsDir = path.join(tenantsDir, slug, "assets");
    const dest = path.join(destRoot, slug);
    fs.mkdirSync(dest, { recursive: true });
    if (!fs.existsSync(assetsDir)) continue;
    for (const file of fs.readdirSync(assetsDir)) {
      const src = path.join(assetsDir, file);
      if (!fs.statSync(src).isFile()) continue;
      fs.copyFileSync(src, path.join(dest, file));
    }
  }
}

console.log(`Prepared agency assets for: ${slugs.join(", ")}`);
