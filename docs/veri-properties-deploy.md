# Veri Properties

Veri runs on the **shared** Neon project (`rent-or-let`) as agency slug `veri-properties`, not a separate database.

Registry slug: `veri-properties`. Public platform host: `veri.letflow.app` (alias in [`packages/config/src/host.ts`](../packages/config/src/host.ts)).

The migration seeds an empty Veri agency + default branch. Do not copy PMS listings into it. The old Veri Neon project is unused.

## Platform + site (same two Vercel projects as PMS)

1. On the **platform** project (`letflow-platform` / `apps/web`), use the shared PMS Neon credentials and Veri site hooks:

```
DATABASE_URL=...                         # rent-or-let Neon
NEON_AUTH_BASE_URL=...
NEON_AUTH_COOKIE_SECRET=...
AGENCY_SLUGS=pms,veri-properties

AGENCY_VERI_PROPERTIES_PUBLIC_SITE_URL=https://veri.properties
AGENCY_VERI_PROPERTIES_WEBSITE_ENABLED=true
AGENCY_VERI_PROPERTIES_REVALIDATE_URL=https://veri.properties/api/revalidate
AGENCY_VERI_PROPERTIES_REVALIDATE_SECRET=...   # must match letflow-sites
```

Do **not** set `AGENCY_VERI_PROPERTIES_DATABASE_URL` or Veri-specific Neon Auth URLs — shared env is enough.

2. Neon Auth trusted origins (rent-or-let project): `https://pms.letflow.app`, `https://veri.letflow.app`, and `http://localhost:3000`.
3. Domain `veri.letflow.app` is on the platform project. `veri.properties` / `www` stay on the **site** project (`apps/site`).
4. To re-seed Veri only (shared DB already migrated):

```bash
# Prefer createAgency in code, or:
psql "$DATABASE_URL" -f tenants/veri-properties/seed.sql
```

Staff: `https://veri.letflow.app`. Public site: `https://veri.properties` (same `apps/site` code as rent-or-let).

Verify isolation: `GET https://veri.letflow.app/api/v1/public/listings` returns `[]` while PMS still lists Middlesbrough homes.

Do not set `TENANT_ID` at build time.
