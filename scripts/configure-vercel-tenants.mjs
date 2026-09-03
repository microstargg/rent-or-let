/**
 * Set Root Directory + TENANT_ID on both Vercel projects.
 *
 * Requires VERCEL_TOKEN (https://vercel.com/account/tokens) and a Hobby/Pro
 * token that can manage team_R5DSeThJW7dLiZDKRhL5WDVU.
 *
 *   $env:VERCEL_TOKEN="..."
 *   node scripts/configure-vercel-tenants.mjs
 */
const TEAM_ID = "team_R5DSeThJW7dLiZDKRhL5WDVU";
const PMS_PROJECT = "prj_h4goKFdOWtH1pgbyZrymSps2C7Zh";
const VERI_PROJECT = "prj_gNJFdThvbo1IyUWsUl6KTdTDVpUP";
const API = "https://api.vercel.com";

const token = process.env.VERCEL_TOKEN?.trim();
if (!token) {
  console.error("Set VERCEL_TOKEN then re-run this script.");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function ensureEnv(projectId, key, value) {
  const existing = await api("GET", `/v9/projects/${projectId}/env`);
  const envs = existing.envs ?? existing;
  const already = (Array.isArray(envs) ? envs : []).filter((e) => e.key === key);
  if (already.length) {
    console.log(`  ${key} already set (${already.length} entries)`);
    return;
  }
  await api("POST", `/v10/projects/${projectId}/env`, {
    key,
    value,
    type: "plain",
    target: ["production", "preview", "development"],
  });
  console.log(`  added ${key}=${value}`);
}

console.log("Updating rent-or-let rootDirectory...");
await api("PATCH", `/v9/projects/${PMS_PROJECT}`, {
  rootDirectory: "apps/web",
  sourceFilesOutsideRootDirectory: true,
  framework: "nextjs",
});
await ensureEnv(PMS_PROJECT, "TENANT_ID", "pms");

console.log("Updating veri-properties rootDirectory...");
await api("PATCH", `/v9/projects/${VERI_PROJECT}`, {
  rootDirectory: "apps/web",
  sourceFilesOutsideRootDirectory: true,
  framework: "nextjs",
});
await ensureEnv(VERI_PROJECT, "TENANT_ID", "veri-properties");
await ensureEnv(VERI_PROJECT, "NEXT_PUBLIC_SITE_URL", "https://veri.properties");

console.log("Done. Add Veri DATABASE_URL / Neon Auth / Blob / Resend in the Vercel dashboard.");
