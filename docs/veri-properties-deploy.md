# Veri Properties

Veri is rebuilt from the PMS **schema**, not from old Veri data (that database was an empty shell).

Registry slug: `veri-properties`. Public platform host: `veri.letflow.app` (alias in [`packages/config/src/host.ts`](../packages/config/src/host.ts)).

The Veri Neon project already has the shared schema and a branch row. Do not copy PMS listings into it.

## Platform + site (same two Vercel projects as PMS)

1. On the **platform** project (`rent-or-let` / `apps/web`), copy `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` from the old Veri Vercel env and set:

```
AGENCY_VERI_PROPERTIES_DATABASE_URL=...
AGENCY_VERI_PROPERTIES_NEON_AUTH_BASE_URL=...
AGENCY_VERI_PROPERTIES_NEON_AUTH_COOKIE_SECRET=...
AGENCY_VERI_PROPERTIES_PUBLIC_SITE_URL=https://veri.properties
AGENCY_VERI_PROPERTIES_WEBSITE_ENABLED=true
AGENCY_VERI_PROPERTIES_REVALIDATE_URL=https://veri.properties/api/revalidate
AGENCY_VERI_PROPERTIES_REVALIDATE_SECRET=...
```

2. Neon Auth trusted origin: `https://veri.letflow.app` (and `http://localhost:3000`).
3. Domain `veri.letflow.app` is on the platform project. `veri.properties` / `www` stay on the **site** project (`apps/site`).
4. If the schema is ever wiped, re-apply with:

```bash
AGENCY_SLUG=veri-properties npm run db:setup
```

Staff: `https://veri.letflow.app`. Public site: `https://veri.properties` (same `apps/site` code as rent-or-let).

Do not set `TENANT_ID` at build time.
