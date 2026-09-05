# Client setup playbook

Use this checklist when onboarding a letting agency onto LetFlow.

**Live today:** `pms` (Property Management Services / rent-or-let).
**Rebuild next:** `veri-properties` (Veri Properties) — empty shell; recreate from the PMS schema, do not migrate old Veri data.

## Architecture

- **One platform app:** [`apps/web`](../apps/web) on `{slug}.letflow.app` — staff, renter portal, landlord portal, APIs
- **Optional public site:** [`apps/site`](../apps/site) on the agency's own domain — listings are pulled from the platform API (not copied)
- **Per-agency data:** one Neon Postgres + Neon Auth project per agency
- **Control plane:** runtime agency registry (hostname → slug → that agency's database). Do not set `TENANT_ID` at build time for production.

`veri.letflow.app` is an alias for registry slug `veri-properties`.

## 1. Add an agency folder

Create `tenants/<slug>/` with:

| File | Purpose |
|------|---------|
| `config.ts` | Branding (name, domain, colours, payment ref prefix) |
| `site.ts` | Marketing copy used by the optional website |
| `theme.css` | Public-site colour overrides (also listed in `agency-themes.css`) |
| `assets/icon.svg` | Favicon (copied to `public/agencies/<slug>/` at prepare time) |
| `seed.sql` | Initial branch row and optional sample properties |

Register the slug in [`packages/config/src/registry.ts`](../packages/config/src/registry.ts). Short hostnames (`veri` → `veri-properties`) go in [`packages/config/src/host.ts`](../packages/config/src/host.ts).

## 2. Provision infrastructure

| Service | Purpose |
|---------|---------|
| **Neon** project | Isolated Postgres + Auth for this agency (clone schema via `npm run db:setup`, not a dump of another agency's rows) |
| **Vercel** (platform) | One LetFlow project (`apps/web`) — add `{slug}.letflow.app` |
| **Vercel** (site, optional) | One site project (`apps/site`) — add their marketing domain |
| **Vercel Blob** | Property images |
| **Resend / Stripe / Rightmove / OTM** | Configured per agency |

Apex `letflow.app` stays on the sales site project. Do not attach it to the platform.

## 3. Environment variables

On the **single platform** Vercel project, set per-agency secrets. Do **not** set production `NEXT_PUBLIC_PLATFORM_URL` to one hostname — origins come from the request agency.

```
AGENCY_SLUGS=pms,veri-properties
AGENCY_PMS_DATABASE_URL=...
AGENCY_PMS_NEON_AUTH_BASE_URL=...
AGENCY_PMS_NEON_AUTH_COOKIE_SECRET=...
AGENCY_PMS_PUBLIC_SITE_URL=https://www.rent-or-let.co.uk
AGENCY_PMS_WEBSITE_ENABLED=true
AGENCY_PMS_REVALIDATE_URL=https://www.rent-or-let.co.uk/api/revalidate
AGENCY_PMS_REVALIDATE_SECRET=...
```

Repeat `AGENCY_VERI_PROPERTIES_*` when rebuilding Veri. Backend-only clients omit `PUBLIC_SITE_URL` and set `WEBSITE_ENABLED=false`.

Staff sign in at `https://pms.letflow.app` or `https://veri.letflow.app`. Bookmark `/admin` still 301s to `/`.

Until Veri secrets are copied onto the platform project as `AGENCY_VERI_PROPERTIES_*`, `veri.letflow.app` will resolve the right slug but have no database — copy those three keys from the old Veri Vercel env as in [veri-properties-deploy.md](./veri-properties-deploy.md).

`www.rent-or-let.co.uk` is assigned to the site project. Point DNS at Vercel with `A www.rent-or-let.co.uk 76.76.21.21` (nameservers today are still the registrar’s).

Local only: `NEXT_PUBLIC_PLATFORM_URL=http://localhost:3000` and `NEXT_PUBLIC_SITE_URL=http://localhost:3001`.

## 4. Local development

```bash
npm install
cp .env.example apps/web/.env.local
cp .env.example apps/site/.env.local
# Platform
npm run dev -w @repo/web
# Optional site (port 3001)
npm run dev -w @repo/site
```

Open `http://localhost:3000` for LetFlow and `http://localhost:3001` for the public site. Set `AGENCY_SLUG=pms` (or use `pms.localhost`).

## 5. Database

```bash
AGENCY_SLUG=<slug> npm run db:setup
```

Applies every file in `packages/database/drizzle/` then `tenants/<slug>/seed.sql`. Uses `AGENCY_{SLUG}_DATABASE_URL` if set, otherwise `DATABASE_URL`.

## 6. Public listings API

Optional websites read published listings from:

- `GET https://{slug}.letflow.app/api/v1/public/listings`
- `GET https://{slug}.letflow.app/api/v1/public/listings/{slug}`
- `POST https://{slug}.letflow.app/api/v1/public/enquiries` (and `/applications`, `/complaints`)

When a listing is published, the platform pings `AGENCY_*_REVALIDATE_URL` so the site ISR cache refreshes.

## 7. PMS then Veri

1. **PMS (live data):** platform `pms.letflow.app` + site `www.rent-or-let.co.uk` against the existing PMS Neon.
2. **Veri (rebuild):** new/reset Neon from this schema + `tenants/veri-properties/seed.sql`. Do not copy PMS rows. Then `veri.letflow.app` + `veri.properties` on the same two Vercel projects.

Self-serve signup on letflow.app is later: insert an agency record, the Host router already works. No new Vercel project per customer.

## Rules for developers

- Platform changes → `apps/web` or `packages/*` → every agency on the next deploy
- Agency branding/copy → `tenants/<slug>/` only
- Do not put database URLs in client-sent tenant config
- Do not copy property rows into the marketing site
